// StepsScreen.tsx — Live GPS step tracking, Supabase persistence, daily/weekly/monthly reports
import {
  StyleSheet, Text, View, ScrollView, Pressable,
  Alert, Modal, Animated,
} from "react-native";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon  from "react-native-vector-icons/FontAwesome";
import Icon2 from "react-native-vector-icons/FontAwesome5";
import Icon3 from "react-native-vector-icons/Ionicons";
import { BarChart } from "react-native-gifted-charts";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "../lib/supabase";
import { ThemeColors, DEFAULT_THEME } from "../components/theme";

interface StepsScreenProps {
  onClose: () => void;
  themeColors?: ThemeColors;
}

interface DayLog {
  date: string; label: string;
  steps: number; calories: number; distanceKm: number; activeMinutes: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STEP_M       = 0.75;
const CAL_PER_STEP = 0.04;
const CADENCE      = 100;
const DAILY_GOAL   = 10000;
const STORAGE_KEY  = "@fitlife_steps_logs";
const DAY_LABELS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Pure helpers ──────────────────────────────────────────────────────────────
const stepsCal = (s:number) => Math.round(s * CAL_PER_STEP);
const stepsKm  = (s:number) => parseFloat((s * STEP_M / 1000).toFixed(2));
const stepsMin = (s:number) => Math.round(s / CADENCE);
const fmtDate  = (d:Date)   => d.toISOString().split("T")[0];
const getLast  = (n:number) => Array.from({length:n},(_,i)=>{
  const d = new Date(); d.setDate(d.getDate()-(n-1-i));
  return { date:fmtDate(d), label:DAY_LABELS[d.getDay()] };
});
const haversineM = (la1:number,lo1:number,la2:number,lo2:number) => {
  const R=6371000, f=Math.PI/180;
  const dLa=(la2-la1)*f, dLo=(lo2-lo1)*f;
  const a=Math.sin(dLa/2)**2+Math.cos(la1*f)*Math.cos(la2*f)*Math.sin(dLo/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};
const emptyLog = (date:string): DayLog => ({
  date, label: DAY_LABELS[new Date(date+"T12:00:00").getDay()],
  steps:0, calories:0, distanceKm:0, activeMinutes:0,
});

export default function StepsScreen({ onClose, themeColors = DEFAULT_THEME }: StepsScreenProps) {
  const T = themeColors;

  // Permission
  const [permStatus, setPermStatus]   = useState<"unknown"|"granted"|"denied">("unknown");
  const [showPermModal, setShowPermModal] = useState(false);

  // Live tracking
  const [isTracking, setIsTracking]   = useState(false);
  const [liveSteps, setLiveSteps]     = useState(0);
  const [liveCal,   setLiveCal]       = useState(0);
  const [liveKm,    setLiveKm]        = useState(0);
  const [liveMin,   setLiveMin]       = useState(0);
  const locSub     = useRef<Location.LocationSubscription|null>(null);
  const lastLoc    = useRef<Location.LocationObject|null>(null);
  const accumDist  = useRef(0);
  const accumSteps = useRef(0);
  const sessionStart = useRef<Date|null>(null);
  const minTimer   = useRef<ReturnType<typeof setInterval>|null>(null);
  const pulseAnim  = useRef(new Animated.Value(1)).current;

  // Report
  const [tab, setTab] = useState<"daily"|"weekly"|"monthly">("daily");
  const [logs7,    setLogs7]    = useState<DayLog[]>([]);
  const [logs30,   setLogs30]   = useState<DayLog[]>([]);
  const [todayLog, setTodayLog] = useState<DayLog>(emptyLog(fmtDate(new Date())));
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Pulse while tracking
  useEffect(() => {
    if (!isTracking) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim,{toValue:1.07,duration:700,useNativeDriver:true}),
      Animated.timing(pulseAnim,{toValue:1,   duration:700,useNativeDriver:true}),
    ]));
    loop.start();
    return () => loop.stop();
  }, [isTracking]);

  // On mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") setPermStatus("granted");
      else if (status === "denied") { setPermStatus("denied"); }
      else setShowPermModal(true);
    })();
    loadLogs();
    return () => { stopTracking(false); };
  }, []);

  // Request permission
  const requestPermission = async () => {
    setShowPermModal(false);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      setPermStatus("granted");
      Alert.alert("✅ Permission Granted","Location access enabled — you can now track steps.");
    } else {
      setPermStatus("denied");
      Alert.alert("❌ Permission Denied","Enable location in device Settings to count steps.");
    }
  };

  // Load logs from Supabase + AsyncStorage
  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const last30 = getLast(30);
      const last7  = getLast(7);
      const today  = fmtDate(new Date());
      const map: Record<string,DayLog> = {};
      last30.forEach(d => { map[d.date] = emptyLog(d.date); map[d.date].label = d.label; });

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      if (userId) {
        const { data } = await supabase
          .from("daily_activity_logs")
          .select("log_date, item_name, calories")
          .eq("user_id", userId)
          .eq("activity_type", "exercise")
          .eq("item_category", "steps")
          .gte("log_date", last30[0].date)
          .order("log_date", { ascending: true });

        (data ?? []).forEach((row:any) => {
          const d = row.log_date;
          if (!map[d]) return;
          const m = String(row.item_name ?? "").match(/steps:(\d+)/i);
          const s = m ? parseInt(m[1]) : Math.round((row.calories ?? 0) / CAL_PER_STEP);
          map[d].steps         += s;
          map[d].calories      += row.calories ?? 0;
          map[d].distanceKm     = parseFloat((map[d].distanceKm + stepsKm(s)).toFixed(2));
          map[d].activeMinutes += stepsMin(s);
        });
      } else {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: Record<string,{steps:number;calories:number}> = JSON.parse(raw);
          Object.entries(saved).forEach(([d,v]) => {
            if (!map[d]) return;
            map[d].steps          = v.steps;
            map[d].calories       = v.calories;
            map[d].distanceKm     = stepsKm(v.steps);
            map[d].activeMinutes  = stepsMin(v.steps);
          });
        }
      }

      setLogs30(last30.map(d => map[d.date]));
      setLogs7(last7.map(d  => map[d.date]));
      setTodayLog(map[today] ?? emptyLog(today));
    } catch (e:any) {
      console.warn("StepsScreen loadLogs:", e.message);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // Start tracking
  const startTracking = async () => {
    if (permStatus !== "granted") { setShowPermModal(true); return; }
    accumDist.current = 0; accumSteps.current = 0; lastLoc.current = null;
    sessionStart.current = new Date();
    setLiveSteps(0); setLiveCal(0); setLiveKm(0); setLiveMin(0);
    setIsTracking(true);

    minTimer.current = setInterval(() => {
      if (sessionStart.current)
        setLiveMin(Math.floor((Date.now()-sessionStart.current.getTime())/60000));
    }, 10000);

    try {
      const init = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
      lastLoc.current = init;
      locSub.current  = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval:1000, distanceInterval:1 },
        (loc) => {
          if (!lastLoc.current) { lastLoc.current = loc; return; }
          const dist = haversineM(
            lastLoc.current.coords.latitude, lastLoc.current.coords.longitude,
            loc.coords.latitude,             loc.coords.longitude,
          );
          if (dist > 0.5 && dist < 10) {
            accumDist.current  += dist;
            accumSteps.current  = Math.round(accumDist.current / STEP_M);
            setLiveSteps(accumSteps.current);
            setLiveCal(stepsCal(accumSteps.current));
            setLiveKm(parseFloat((accumDist.current/1000).toFixed(2)));
          }
          lastLoc.current = loc;
        }
      );
    } catch {
      setIsTracking(false);
      Alert.alert("Error","Could not start GPS. Make sure location is enabled.");
    }
  };

  // Stop + save
  const stopTracking = async (save = true) => {
    if (locSub.current)  { locSub.current.remove();           locSub.current  = null; }
    if (minTimer.current) { clearInterval(minTimer.current);  minTimer.current = null; }
    setIsTracking(false);
    if (!save || accumSteps.current === 0) return;

    const steps = accumSteps.current;
    const cals  = stepsCal(steps);
    const today = fmtDate(new Date());

    // AsyncStorage backup
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : {};
      const prev  = saved[today] ?? { steps:0, calories:0 };
      saved[today] = { steps: prev.steps+steps, calories: prev.calories+cals };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {}

    // Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      await supabase.from("daily_activity_logs").insert({
        user_id: uid, log_date: today, activity_type:"exercise",
        item_name: `steps:${steps}`, item_category:"steps",
        calories: cals, logged_at: new Date().toISOString(),
      });
      const { data: ex } = await supabase.from("goal_logs")
        .select("calories_burned").eq("log_date",today).eq("user_id",uid).single();
      await supabase.from("goal_logs").upsert({
        user_id:uid, log_date:today,
        calories_burned: (ex?.calories_burned??0)+cals,
        updated_at: new Date().toISOString(),
      },{ onConflict:"user_id,log_date" });
    } catch (e:any) { console.warn("Steps save:", e.message); }

    Alert.alert("✅ Saved!",`${steps.toLocaleString()} steps · ${cals} kcal logged.`);
    accumSteps.current = 0; accumDist.current = 0;
    loadLogs();
  };

  // Aggregates
  const weekly = {
    steps:    logs7.reduce((s,d)=>s+d.steps,0),
    calories: logs7.reduce((s,d)=>s+d.calories,0),
    km:       parseFloat(logs7.reduce((s,d)=>s+d.distanceKm,0).toFixed(1)),
    minutes:  logs7.reduce((s,d)=>s+d.activeMinutes,0),
    avg:      Math.round(logs7.reduce((s,d)=>s+d.steps,0)/7),
  };
  const week4 = Array.from({length:4},(_,wi)=>{
    const sl = logs30.slice(wi*7,(wi+1)*7);
    return { label:`W${wi+1}`,
      steps:   sl.reduce((s,d)=>s+d.steps,0),
      calories:sl.reduce((s,d)=>s+d.calories,0),
      minutes: sl.reduce((s,d)=>s+d.activeMinutes,0),
    };
  });
  const monthly = {
    steps:    week4.reduce((s,w)=>s+w.steps,0),
    calories: week4.reduce((s,w)=>s+w.calories,0),
    minutes:  week4.reduce((s,w)=>s+w.minutes,0),
    km:       parseFloat((week4.reduce((s,w)=>s+w.steps,0)*STEP_M/1000).toFixed(1)),
  };

  const todayPct = Math.min((todayLog.steps/DAILY_GOAL)*100, 100);
  const weekPct  = Math.min((weekly.steps/(DAILY_GOAL*7))*100, 100);

  const barColor = (s:number) => s >= DAILY_GOAL ? "#4CAF50" : T.primary;

  const weekBarData  = logs7.map(d=>({ value:d.steps,    label:d.label, frontColor:barColor(d.steps) }));
  const weekCalData  = logs7.map(d=>({ value:d.calories, label:d.label, frontColor:"#fc9139" }));
  const weekMinData  = logs7.map(d=>({ value:d.activeMinutes, label:d.label, frontColor:T.accent }));
  const monthBarData = week4.map(w=>({ value:w.steps,    label:w.label, frontColor:T.accent }));

  // Stat cards helper
  const StatCards = ({ items }: { items:{icon:string;lib:string;val:string;lbl:string;col:string}[] }) => (
    <View style={S.triRow}>
      {items.map((s,i)=>(
        <View key={i} style={[S.triCard,{borderColor:T.secondary}]}>
          {s.lib==="fa5" ? <Icon2 name={s.icon} size={18} color={s.col}/> : <Icon name={s.icon} size={18} color={s.col}/>}
          <Text style={[S.triVal,{color:s.col}]}>{s.val}</Text>
          <Text style={S.triLbl}>{s.lbl}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={[S.container,{backgroundColor:T.background}]}>
      <View style={[S.header1,{backgroundColor:T.background}]}/>
      <View style={[S.header,{backgroundColor:T.secondary,borderBottomColor:T.primary+"44"}]}>
        <Text style={[S.title,{color:T.text}]}>Steps Tracker</Text>
        <Pressable onPress={onClose}><Icon name="times-circle" style={[S.closeIcon,{color:T.text}]}/></Pressable>
      </View>

      <ScrollView style={S.content} showsVerticalScrollIndicator={false}>

        {/* ── Permission Banner ──────────────────────────────────────── */}
        <Pressable
          style={[S.permBanner,{
            backgroundColor: permStatus==="granted" ? "rgba(76,175,80,0.1)" : "rgba(255,107,107,0.1)",
            borderColor:     permStatus==="granted" ? "#4CAF50" : "#FF6B6B",
          }]}
          onPress={() => permStatus!=="granted" && setShowPermModal(true)}
        >
          <Icon
            name={permStatus==="granted" ? "check-circle" : "exclamation-triangle"}
            size={15} color={permStatus==="granted" ? "#4CAF50" : "#FF6B6B"}
          />
          <Text style={[S.permText,{color:permStatus==="granted" ? "#4CAF50" : "#FF6B6B"}]}>
            {permStatus==="granted"
              ? "Location granted — GPS step counting active"
              : permStatus==="denied"
              ? "Location denied — tap to open permission settings"
              : "Location permission needed — tap to enable"}
          </Text>
          {permStatus!=="granted" && <Icon name="chevron-right" size={12} color="#888"/>}
        </Pressable>

        {/* ── Live Tracking Card ─────────────────────────────────────── */}
        <View style={[S.section,{backgroundColor:T.card}]}>
          <Text style={[S.sTitle,{color:T.primary}]}>🚶 Live Tracking</Text>
          <Animated.View style={[S.liveCard,{
            borderColor: isTracking ? "#FF6B6B" : T.secondary,
            transform: [{scale: isTracking ? pulseAnim : 1}],
          }]}>
            {/* Status */}
            <View style={S.liveStatusRow}>
              <View style={[S.liveDot,{backgroundColor:isTracking?"#FF6B6B":"#555"}]}/>
              <Text style={[S.liveStatus,{color:isTracking?"#FF6B6B":"#888"}]}>
                {isTracking ? "● Tracking in progress…" : "Ready to track"}
              </Text>
            </View>

            {/* Live stats */}
            <View style={S.liveStats}>
              {[
                {icon:"walking",   lib:"fa5", val:isTracking?liveSteps.toLocaleString():"—", lbl:"Steps",  col:T.primary},
                {icon:"fire",      lib:"fa",  val:isTracking?liveCal.toString():"—",          lbl:"kcal",   col:"#fc9139"},
                {icon:"route",     lib:"fa5", val:isTracking?liveKm.toFixed(2):"—",           lbl:"km",     col:T.accent},
                {icon:"clock",     lib:"fa",  val:isTracking?liveMin.toString():"—",           lbl:"min",    col:"#84d7f4"},
              ].map((s,i)=>(
                <View key={i} style={S.liveStat}>
                  {s.lib==="fa5"
                    ? <Icon2 name={s.icon} size={18} color={s.col}/>
                    : <Icon2  name={s.icon} size={18} color={s.col}/>}
                  <Text style={[S.liveVal,{color:s.col}]}>{s.val}</Text>
                  <Text style={S.liveLbl}>{s.lbl}</Text>
                </View>
              ))}
            </View>

            {/* Today progress bar */}
            <View style={S.todayBarWrap}>
              <View style={S.todayBarRow}>
                <Text style={S.todayBarLbl}>Today: {todayLog.steps.toLocaleString()} / {DAILY_GOAL.toLocaleString()}</Text>
                <Text style={[S.todayBarPct,{color:todayPct>=100?"#4CAF50":T.primary}]}>{Math.round(todayPct)}%</Text>
              </View>
              <View style={S.progressBg}>
                <View style={[S.progressFill,{width:`${todayPct}%`,backgroundColor:todayPct>=100?"#4CAF50":T.primary}]}/>
              </View>
            </View>

            <Pressable
              style={[S.trackBtn,{backgroundColor:isTracking?"#FF6B6B":T.primary}]}
              onPress={isTracking ? ()=>stopTracking(true) : startTracking}
              disabled={permStatus==="denied"}
            >
              <Icon name={isTracking?"stop-circle":"play-circle"} size={20} color="#fff"/>
              <Text style={S.trackBtnTxt}>{isTracking?"Stop & Save":"Start Tracking"}</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* ── Report Tabs ────────────────────────────────────────────── */}
        <View style={[S.section,{backgroundColor:T.card}]}>
          <Text style={[S.sTitle,{color:T.primary}]}>📊 Progress Report</Text>

          <View style={[S.tabRow,{backgroundColor:T.secondary}]}>
            {(["daily","weekly","monthly"] as const).map(t=>(
              <Pressable key={t} style={[S.tab, tab===t&&{backgroundColor:T.primary}]} onPress={()=>setTab(t)}>
                <Text style={[S.tabTxt,{color:tab===t?"#fff":"#888"}]}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Daily Tab ─────────────────────────────────────────────── */}
          {tab==="daily" && (
            <>
              <StatCards items={[
                {icon:"walking", lib:"fa5", val:todayLog.steps.toLocaleString(),        lbl:"Steps Today",  col:T.primary},
                {icon:"fire",    lib:"fa",  val:todayLog.calories.toString(),            lbl:"kcal Burned",  col:"#fc9139"},
                {icon:"clock-o",   lib:"fa",  val:todayLog.activeMinutes+" min",          lbl:"Active Time",  col:"#84d7f4"},
                {icon:"route",   lib:"fa5", val:todayLog.distanceKm+" km",              lbl:"Distance",     col:T.accent},
              ]}/>

              {/* Goal ring card */}
              <View style={[S.goalBox,{borderColor:T.primary+"44"}]}>
                <View style={S.goalRingWrap}>
                  <View style={[S.goalRingBg,{borderColor:T.secondary}]}/>
                  <View style={S.goalRingInner}>
                    <Text style={[S.goalPct,{color:todayPct>=100?"#4CAF50":T.primary}]}>{Math.round(todayPct)}%</Text>
                    <Text style={S.goalLbl}>goal</Text>
                  </View>
                </View>
                <View style={{flex:1,gap:4}}>
                  <Text style={[S.goalTitle,{color:T.text}]}>Daily Goal: {DAILY_GOAL.toLocaleString()} steps</Text>
                  <Text style={S.goalSub}>
                    {todayLog.steps>=DAILY_GOAL ? "🎉 Goal reached!" : `${(DAILY_GOAL-todayLog.steps).toLocaleString()} steps to go`}
                  </Text>
                  <Text style={S.goalSub}>≈ {todayLog.activeMinutes} min walk · {todayLog.distanceKm} km</Text>
                </View>
              </View>

              <View style={[S.insightBox,{borderColor:todayLog.calories>200?"#4CAF50":T.primary}]}>
                <Text style={[S.insightTxt,{color:todayLog.calories>200?"#4CAF50":T.primary}]}>
                  {todayLog.calories>400
                    ? "🔥 Excellent activity today! Keep it up."
                    : todayLog.calories>200
                    ? "✅ Good progress — a short evening walk will hit your goal."
                    : "💡 Start moving! A 10-min walk adds ~500 steps and burns ~20 kcal."}
                </Text>
              </View>
            </>
          )}

          {/* ── Weekly Tab ────────────────────────────────────────────── */}
          {tab==="weekly" && (
            <>
              <StatCards items={[
                {icon:"walking", lib:"fa5", val:weekly.steps.toLocaleString(),   lbl:"Total Steps",  col:T.primary},
                {icon:"fire",    lib:"fa",  val:weekly.calories.toLocaleString(), lbl:"kcal Burned",  col:"#fc9139"},
                {icon:"clock-o",   lib:"fa",  val:weekly.minutes+" min",           lbl:"Active Time",  col:"#84d7f4"},
                {icon:"route",   lib:"fa5", val:weekly.km+" km",                 lbl:"Distance",     col:T.accent},
              ]}/>

              <View style={S.wkPrgWrap}>
                <View style={S.wkPrgRow}>
                  <Text style={S.wkPrgLbl}>Week goal: {(DAILY_GOAL*7).toLocaleString()} steps</Text>
                  <Text style={[S.wkPrgPct,{color:weekPct>=100?"#4CAF50":T.primary}]}>{Math.round(weekPct)}%</Text>
                </View>
                <View style={S.progressBg}>
                  <View style={[S.progressFill,{width:`${weekPct}%`,backgroundColor:weekPct>=100?"#4CAF50":T.primary}]}/>
                </View>
                <Text style={S.wkAvg}>Daily avg: {weekly.avg.toLocaleString()} steps</Text>
              </View>

              <Text style={[S.chartTitle,{color:T.primary}]}>Daily Steps (Green = goal met)</Text>
              <View style={S.chartWrap}>
                <BarChart data={weekBarData} width={300} height={130} barWidth={30} spacing={14}
                  roundedTop roundedBottom isAnimated
                  xAxisThickness={1} yAxisThickness={1} xAxisColor="#362c3a" yAxisColor="#362c3a"
                  xAxisLabelTextStyle={{color:"#ccc",fontSize:10}} yAxisTextStyle={{color:"#ccc",fontSize:9}}
                  noOfSections={4} maxValue={Math.max(...weekBarData.map(d=>d.value),DAILY_GOAL)+1000}
                  referenceLine1Config={{color:"#4CAF5055",width:1,type:"dashed"}} referenceLine1Position={DAILY_GOAL}/>
              </View>

              <Text style={[S.chartTitle,{color:T.primary}]}>Calories Burned Per Day</Text>
              <View style={S.chartWrap}>
                <BarChart data={weekCalData} width={300} height={110} barWidth={30} spacing={14}
                  roundedTop roundedBottom isAnimated
                  xAxisThickness={1} yAxisThickness={1} xAxisColor="#362c3a" yAxisColor="#362c3a"
                  xAxisLabelTextStyle={{color:"#ccc",fontSize:10}} yAxisTextStyle={{color:"#ccc",fontSize:9}}
                  noOfSections={4} maxValue={Math.max(...weekCalData.map(d=>d.value),400)+50}/>
              </View>

              <Text style={[S.chartTitle,{color:T.primary}]}>Active Minutes Per Day</Text>
              <View style={S.chartWrap}>
                <BarChart data={weekMinData} width={300} height={100} barWidth={30} spacing={14}
                  roundedTop roundedBottom isAnimated
                  xAxisThickness={1} yAxisThickness={1} xAxisColor="#362c3a" yAxisColor="#362c3a"
                  xAxisLabelTextStyle={{color:"#ccc",fontSize:10}} yAxisTextStyle={{color:"#ccc",fontSize:9}}
                  noOfSections={4} maxValue={Math.max(...weekMinData.map(d=>d.value),60)+10}/>
              </View>
            </>
          )}

          {/* ── Monthly Tab ───────────────────────────────────────────── */}
          {tab==="monthly" && (
            <>
              <StatCards items={[
                {icon:"walking", lib:"fa5", val:monthly.steps.toLocaleString(),   lbl:"Total Steps",  col:T.primary},
                {icon:"fire",    lib:"fa",  val:monthly.calories.toLocaleString(), lbl:"kcal Burned",  col:"#fc9139"},
                {icon:"clock-o",   lib:"fa",  val:monthly.minutes+" min",           lbl:"Active Time",  col:"#84d7f4"},
                {icon:"route",   lib:"fa5", val:monthly.km+" km",                 lbl:"Distance",     col:T.accent},
              ]}/>

              <Text style={[S.chartTitle,{color:T.primary}]}>Steps by Week (Last 30 Days)</Text>
              <View style={S.chartWrap}>
                <BarChart data={monthBarData} width={280} height={130} barWidth={48} spacing={20}
                  roundedTop roundedBottom isAnimated
                  xAxisThickness={1} yAxisThickness={1} xAxisColor="#362c3a" yAxisColor="#362c3a"
                  xAxisLabelTextStyle={{color:"#ccc",fontSize:11}} yAxisTextStyle={{color:"#ccc",fontSize:9}}
                  noOfSections={4} maxValue={Math.max(...monthBarData.map(d=>d.value),DAILY_GOAL*7)+2000}/>
              </View>

              <View style={[S.monthCalBox,{backgroundColor:T.secondary,borderColor:T.primary+"44"}]}>
                <Icon name="fire" size={22} color="#fc9139"/>
                <View><Text style={[S.mCalVal,{color:T.text}]}>{monthly.calories.toLocaleString()} kcal</Text><Text style={S.mCalLbl}>burned walking</Text></View>
                <View><Text style={[S.mCalVal,{color:T.accent}]}>{monthly.minutes} min</Text><Text style={S.mCalLbl}>total active</Text></View>
                <View><Text style={[S.mCalVal,{color:T.primary}]}>{monthly.km} km</Text><Text style={S.mCalLbl}>total distance</Text></View>
              </View>

              {/* Per-week breakdown */}
              <Text style={[S.chartTitle,{color:T.primary}]}>Weekly Breakdown</Text>
              {week4.map((w,i)=>(
                <View key={i} style={[S.histRow,{borderBottomColor:T.secondary}]}>
                  <View style={[S.histDateBox,{backgroundColor:T.secondary}]}>
                    <Text style={[S.histDay,{color:T.primary}]}>{w.label}</Text>
                  </View>
                  <View style={{flex:1,gap:3}}>
                    <View style={S.histStepsRow}>
                      <Icon3 name="footsteps" size={13} color={T.accent}/>
                      <Text style={[S.histSteps,{color:T.text}]}>{w.steps.toLocaleString()} steps</Text>
                    </View>
                    <View style={S.histMeta}>
                      <Text style={S.histMetaTxt}>{w.minutes} min</Text>
                      <View style={S.histDot}/>
                      <Text style={S.histMetaTxt}>{(w.steps*STEP_M/1000).toFixed(1)} km</Text>
                    </View>
                    <View style={S.miniBarBg}>
                      <View style={[S.miniBarFill,{
                        width:`${Math.min((w.steps/(DAILY_GOAL*7))*100,100)}%`,
                        backgroundColor:w.steps>=DAILY_GOAL*7?"#4CAF50":T.primary,
                      }]}/>
                    </View>
                  </View>
                  <View style={S.histRight}>
                    <Icon name="fire" size={13} color="#fc9139"/>
                    <Text style={S.histCal}>{w.calories}</Text>
                    <Text style={S.histCalLbl}>kcal</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* ── Recent Walk History ────────────────────────────────────── */}
        <View style={[S.section,{backgroundColor:T.card}]}>
          <Text style={[S.sTitle,{color:T.primary}]}>📅 Recent Walk History</Text>
          {loadingLogs ? (
            <Text style={S.emptyTxt}>Loading…</Text>
          ) : logs7.filter(d=>d.steps>0).length===0 ? (
            <Text style={S.emptyTxt}>No walks recorded yet. Start tracking to build history!</Text>
          ) : (
            [...logs7].reverse().filter(d=>d.steps>0).map((d,i)=>(
              <View key={i} style={[S.histRow,{borderBottomColor:T.secondary}]}>
                <View style={[S.histDateBox,{backgroundColor:T.secondary}]}>
                  <Text style={[S.histDay,{color:T.primary}]}>{d.label}</Text>
                  <Text style={S.histDate}>{d.date.slice(5)}</Text>
                </View>
                <View style={{flex:1,gap:4}}>
                  <View style={S.histStepsRow}>
                    <Icon3 name="footsteps" size={13} color={T.accent}/>
                    <Text style={[S.histSteps,{color:T.text}]}>{d.steps.toLocaleString()} steps</Text>
                  </View>
                  <View style={S.histMeta}>
                    <Text style={S.histMetaTxt}>{d.distanceKm} km</Text>
                    <View style={S.histDot}/>
                    <Text style={S.histMetaTxt}>{d.activeMinutes} min</Text>
                  </View>
                  <View style={S.miniBarBg}>
                    <View style={[S.miniBarFill,{
                      width:`${Math.min((d.steps/DAILY_GOAL)*100,100)}%`,
                      backgroundColor:d.steps>=DAILY_GOAL?"#4CAF50":T.primary,
                    }]}/>
                  </View>
                </View>
                <View style={S.histRight}>
                  <Icon name="fire" size={13} color="#fc9139"/>
                  <Text style={S.histCal}>{d.calories}</Text>
                  <Text style={S.histCalLbl}>kcal</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── How It Works ──────────────────────────────────────────── */}
        <View style={[S.section,{backgroundColor:T.card}]}>
          <Text style={[S.sTitle,{color:T.primary}]}>💡 How It Works</Text>
          {[
            {icon:"map-marker-alt", txt:"GPS location measures distance as you walk. Steps = distance ÷ 0.75 m (avg stride)."},
            {icon:"fire-alt",       txt:"Calories = steps × 0.04 kcal. A 10,000-step walk burns ~400 kcal for an average adult."},
            {icon:"clock",          txt:"Active minutes = steps ÷ 100 (average walking cadence of 100 steps/min)."},
            {icon:"chart-bar",      txt:"All sessions are saved and feed directly into the Weekly Report for consistency tracking."},
          ].map((item,i)=>(
            <View key={i} style={S.howRow}>
              <Icon2 name={item.icon} size={15} color={T.primary} style={{width:22,marginTop:2}}/>
              <Text style={S.howTxt}>{item.txt}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* ── Permission Modal ───────────────────────────────────────── */}
      <Modal visible={showPermModal} transparent animationType="fade">
        <View style={S.modalOverlay}>
          <View style={[S.modalCard,{backgroundColor:T.card,borderColor:T.primary}]}>
            <View style={[S.modalIconCircle,{backgroundColor:T.primary}]}>
              <Icon2 name="map-marker-alt" size={28} color="#fff"/>
            </View>
            <Text style={[S.modalTitle,{color:T.text}]}>Location Permission</Text>
            <Text style={S.modalBody}>
              FitLife needs location access to count steps by measuring GPS distance as you walk.
              {"\n\n"}Your location is used only during tracking and is never stored or shared.
            </Text>
            <View style={S.modalBtns}>
              <Pressable style={[S.modalBtn,{backgroundColor:T.primary}]} onPress={requestPermission}>
                <Icon name="check" size={15} color="#fff"/>
                <Text style={S.modalBtnTxt}>Allow Location</Text>
              </Pressable>
              <Pressable style={[S.modalBtn,{backgroundColor:T.secondary}]} onPress={()=>setShowPermModal(false)}>
                <Icon name="times" size={15} color="#aaa"/>
                <Text style={[S.modalBtnTxt,{color:"#aaa"}]}>Not Now</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container:{position:"absolute",top:0,left:0,right:0,bottom:0,zIndex:400},
  header1:{height:35}, closeIcon:{fontSize:30,color:"#fff"},
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:20,paddingVertical:15,borderBottomWidth:1},
  title:{fontSize:24,fontWeight:"bold",color:"#fff"},
  content:{flex:1,padding:15},
  permBanner:{flexDirection:"row",alignItems:"center",gap:8,padding:11,borderRadius:12,borderWidth:1,marginBottom:14},
  permText:{flex:1,fontSize:12,fontWeight:"600"},
  section:{borderRadius:16,padding:16,marginBottom:15},
  sTitle:{fontSize:17,fontWeight:"800",marginBottom:12},
  liveCard:{borderRadius:16,borderWidth:1.5,padding:16,gap:12},
  liveStatusRow:{flexDirection:"row",alignItems:"center",gap:8},
  liveDot:{width:10,height:10,borderRadius:5},
  liveStatus:{fontSize:13,fontWeight:"700"},
  liveStats:{flexDirection:"row",justifyContent:"space-around"},
  liveStat:{alignItems:"center",gap:4},
  liveVal:{fontSize:20,fontWeight:"900"},
  liveLbl:{fontSize:10,color:"#888"},
  todayBarWrap:{gap:5},
  todayBarRow:{flexDirection:"row",justifyContent:"space-between"},
  todayBarLbl:{fontSize:12,color:"#888"},
  todayBarPct:{fontSize:12,fontWeight:"800"},
  progressBg:{height:8,backgroundColor:"#2a2335",borderRadius:4,overflow:"hidden"},
  progressFill:{height:8,borderRadius:4},
  trackBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",paddingVertical:14,borderRadius:14,gap:10,marginTop:4},
  trackBtnTxt:{fontSize:15,fontWeight:"800",color:"#fff"},
  tabRow:{flexDirection:"row",borderRadius:12,padding:4,marginBottom:14},
  tab:{flex:1,paddingVertical:9,alignItems:"center",borderRadius:10},
  tabTxt:{fontSize:13,fontWeight:"700"},
  triRow:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:12},
  triCard:{width:"47%",borderRadius:12,padding:12,alignItems:"center",gap:4,borderWidth:1,backgroundColor:"rgba(0,0,0,0.2)"},
  triVal:{fontSize:20,fontWeight:"900"},
  triLbl:{fontSize:10,color:"#888",textAlign:"center"},
  goalBox:{flexDirection:"row",alignItems:"center",borderRadius:14,borderWidth:1,padding:14,marginBottom:10,gap:14,backgroundColor:"rgba(0,0,0,0.2)"},
  goalRingWrap:{width:76,height:76,alignItems:"center",justifyContent:"center"},
  goalRingBg:{position:"absolute",width:76,height:76,borderRadius:38,borderWidth:6},
  goalRingInner:{alignItems:"center"},
  goalPct:{fontSize:18,fontWeight:"900"},
  goalLbl:{fontSize:10,color:"#888"},
  goalTitle:{fontSize:14,fontWeight:"700",color:"#fff"},
  goalSub:{fontSize:12,color:"#888"},
  insightBox:{borderWidth:1,borderRadius:10,padding:11,marginBottom:4,backgroundColor:"rgba(0,0,0,0.2)"},
  insightTxt:{fontSize:13,lineHeight:18,fontWeight:"600"},
  wkPrgWrap:{marginBottom:14,gap:6},
  wkPrgRow:{flexDirection:"row",justifyContent:"space-between"},
  wkPrgLbl:{fontSize:12,color:"#888"},
  wkPrgPct:{fontSize:12,fontWeight:"800"},
  wkAvg:{fontSize:11,color:"#666",marginTop:2},
  chartTitle:{fontSize:12,fontWeight:"700",textTransform:"uppercase",letterSpacing:0.4,marginBottom:7,marginTop:6},
  chartWrap:{alignItems:"center",marginBottom:10},
  monthCalBox:{flexDirection:"row",alignItems:"center",gap:14,padding:14,borderRadius:12,borderWidth:1,marginTop:8},
  mCalVal:{fontSize:16,fontWeight:"800"},
  mCalLbl:{fontSize:10,color:"#888"},
  histRow:{flexDirection:"row",alignItems:"center",paddingVertical:12,borderBottomWidth:1,gap:12},
  histDateBox:{width:46,borderRadius:10,padding:8,alignItems:"center"},
  histDay:{fontSize:12,fontWeight:"800"},
  histDate:{fontSize:10,color:"#888"},
  histStepsRow:{flexDirection:"row",alignItems:"center",gap:6},
  histSteps:{fontSize:14,fontWeight:"700"},
  histMeta:{flexDirection:"row",alignItems:"center",gap:6},
  histMetaTxt:{fontSize:11,color:"#888"},
  histDot:{width:3,height:3,borderRadius:2,backgroundColor:"#555"},
  miniBarBg:{height:4,backgroundColor:"#2a2335",borderRadius:2,overflow:"hidden",marginTop:2},
  miniBarFill:{height:4,borderRadius:2},
  histRight:{alignItems:"center",gap:2},
  histCal:{fontSize:16,fontWeight:"900",color:"#fc9139"},
  histCalLbl:{fontSize:10,color:"#888"},
  howRow:{flexDirection:"row",alignItems:"flex-start",gap:10,marginBottom:10},
  howTxt:{flex:1,fontSize:13,color:"#aaa",lineHeight:18},
  emptyTxt:{fontSize:13,color:"#555",fontStyle:"italic",textAlign:"center",paddingVertical:14},
  modalOverlay:{flex:1,backgroundColor:"rgba(0,0,0,0.85)",justifyContent:"center",alignItems:"center"},
  modalCard:{width:"88%",borderRadius:22,padding:28,alignItems:"center",gap:14,borderWidth:1.5},
  modalIconCircle:{width:70,height:70,borderRadius:35,alignItems:"center",justifyContent:"center"},
  modalTitle:{fontSize:20,fontWeight:"900"},
  modalBody:{fontSize:14,color:"#aaa",textAlign:"center",lineHeight:20},
  modalBtns:{width:"100%",gap:10},
  modalBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",paddingVertical:14,borderRadius:14,gap:10},
  modalBtnTxt:{fontSize:15,fontWeight:"700",color:"#fff"},
});