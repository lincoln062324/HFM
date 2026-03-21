// SettingsScreen.tsx
// Theme picker · Camera sound toggle · Live habit reminder alerts · About section
import {
  StyleSheet, Text, View, ScrollView, Pressable,
  Switch, Alert, Modal, useColorScheme,
} from "react-native";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon5 from "react-native-vector-icons/FontAwesome5";
import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "../lib/supabase";

interface SettingsScreenProps {
  onClose: () => void;
  currentTheme?: string;
  onThemeChange?: (themeId: string) => void;
}

interface ThemeColor {
  id: string; name: string; emoji: string;
  primary: string; secondary: string; background: string;
  card: string; text: string; accent: string; desc: string;
}

interface AppSettings {
  theme: string; notifications: boolean;
  cameraSound: boolean; vibration: boolean;
}

const THEMES: ThemeColor[] = [
  { id:'purple',   name:'Purple Dream',   emoji:'💜', primary:'#c67ee2', secondary:'#1e1929', background:'#15041f', card:'#211c24', text:'#FFFFFF', accent:'#84d7f4', desc:'Soft lavender on deep plum' },
  { id:'midnight', name:'Midnight Blue',  emoji:'🌙', primary:'#5c9cef', secondary:'#1a2035', background:'#0d1423', card:'#182030', text:'#FFFFFF', accent:'#7fc8f8', desc:'Cool steel blue on deep navy' },
  { id:'forest',   name:'Forest Green',   emoji:'🌿', primary:'#5ccc7f', secondary:'#1a2e1c', background:'#0c1f0e', card:'#192d1b', text:'#FFFFFF', accent:'#a8e6b8', desc:'Fresh mint on deep forest' },
  { id:'ember',    name:'Ember Orange',   emoji:'🔥', primary:'#ff9f4a', secondary:'#2a1a0a', background:'#1a0e04', card:'#261706', text:'#FFFFFF', accent:'#ffd080', desc:'Warm amber on dark charcoal' },
  { id:'rose',     name:'Rose Gold',      emoji:'🌸', primary:'#e8849a', secondary:'#2a1520', background:'#1a0c14', card:'#26131e', text:'#FFFFFF', accent:'#f5b8c8', desc:'Dusty rose on deep burgundy' },
  { id:'teal',     name:'Teal Mist',      emoji:'🌊', primary:'#38c9c0', secondary:'#0f2524', background:'#071918', card:'#0e2523', text:'#FFFFFF', accent:'#7de8e2', desc:'Ocean teal on near-black' },
  { id:'slate',    name:'Slate Grey',     emoji:'🪨', primary:'#94a3b8', secondary:'#1e2432', background:'#111620', card:'#1a2030', text:'#FFFFFF', accent:'#cbd5e1', desc:'Cool grey on dark slate' },
  { id:'gold',     name:'Golden Hour',    emoji:'✨', primary:'#f0c040', secondary:'#221a06', background:'#160f02', card:'#201608', text:'#FFFFFF', accent:'#ffe08a', desc:'Rich gold on espresso' },
];

const DEFAULT_SETTINGS: AppSettings = { theme:'purple', notifications:true, cameraSound:true, vibration:true };
const SETTINGS_KEY = '@fitlife_settings';

const CountdownModal = ({ visible, themeName, countdown, primaryColor, onConfirm, onCancel }:
  { visible:boolean; themeName:string; countdown:number; primaryColor:string; onConfirm:()=>void; onCancel:()=>void }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={ms.overlay}>
      <View style={ms.card}>
        <Icon name="clock-o" style={[ms.icon,{color:primaryColor}]} />
        <Text style={ms.title}>Applying Theme</Text>
        <Text style={[ms.sub,{color:primaryColor}]}>{themeName}</Text>
        <View style={[ms.circle,{borderColor:primaryColor}]}>
          <Text style={ms.num}>{countdown}</Text>
        </View>
        <Text style={ms.hint}>{countdown>0?'Confirm to keep, or it reverts…':'Reverting…'}</Text>
        <View style={ms.row}>
          <Pressable style={[ms.btn,{backgroundColor:primaryColor}]} onPress={onConfirm}>
            <Icon name="check" size={16} color="#fff"/><Text style={ms.btnTxt}>Keep It</Text>
          </Pressable>
          <Pressable style={[ms.btn,{backgroundColor:'#3a2a3a'}]} onPress={onCancel}>
            <Icon name="times" size={16} color="#fff"/><Text style={ms.btnTxt}>Revert</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);
const ms = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.85)',justifyContent:'center',alignItems:'center'},
  card:{backgroundColor:'#1e1929',borderRadius:22,padding:28,width:'86%',alignItems:'center',gap:10,borderWidth:1,borderColor:'#362c3a'},
  icon:{fontSize:44,marginBottom:4}, title:{fontSize:22,fontWeight:'800',color:'#fff'},
  sub:{fontSize:16,fontWeight:'600'}, num:{fontSize:34,fontWeight:'900',color:'#fff'},
  hint:{fontSize:13,color:'#888',textAlign:'center'},
  circle:{width:76,height:76,borderRadius:38,borderWidth:3,justifyContent:'center',alignItems:'center',backgroundColor:'#2a2335'},
  row:{flexDirection:'row',gap:12,marginTop:6,width:'100%'},
  btn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:12,borderRadius:12,gap:8},
  btnTxt:{fontSize:15,fontWeight:'700',color:'#fff'},
});

const HabitAlertModal = ({ visible, habitName, benefits, alarmTime, onDone, onDismiss }:
  { visible:boolean; habitName:string; benefits:string; alarmTime:string; onDone:()=>void; onDismiss:()=>void }) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={as.overlay}>
      <View style={as.card}>
        <View style={as.circle}><Icon name="bell" size={28} color="#fff"/></View>
        <Text style={as.time}>{alarmTime}</Text>
        <Text style={as.label}>Time for your habit!</Text>
        <Text style={as.name}>{habitName}</Text>
        <Text style={as.benefits}>{benefits}</Text>
        <View style={as.row}>
          <Pressable style={as.btnDone} onPress={onDone}>
            <Icon name="check" size={16} color="#fff"/><Text style={as.btnTxt}>Mark Done</Text>
          </Pressable>
          <Pressable style={as.btnDismiss} onPress={onDismiss}>
            <Icon name="times" size={16} color="#fff"/><Text style={as.btnTxt}>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);
const as = StyleSheet.create({
  overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.8)',justifyContent:'flex-end'},
  card:{backgroundColor:'#1e1929',borderTopLeftRadius:26,borderTopRightRadius:26,padding:28,alignItems:'center',gap:10,borderWidth:1,borderColor:'#362c3a'},
  circle:{width:64,height:64,borderRadius:32,backgroundColor:'#c67ee2',justifyContent:'center',alignItems:'center',marginBottom:4},
  time:{fontSize:13,color:'#888',fontWeight:'600'}, label:{fontSize:16,color:'#888'},
  name:{fontSize:22,fontWeight:'800',color:'#fff',textAlign:'center'},
  benefits:{fontSize:13,color:'#aaa',textAlign:'center',lineHeight:18},
  row:{flexDirection:'row',gap:12,width:'100%',marginTop:6},
  btnDone:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:'#4CAF50',paddingVertical:14,borderRadius:14,gap:8},
  btnDismiss:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:'#362c3a',paddingVertical:14,borderRadius:14,gap:8},
  btnTxt:{fontSize:15,fontWeight:'700',color:'#fff'},
});

export default function SettingsScreen({ onClose, currentTheme: initialTheme, onThemeChange }: SettingsScreenProps) {
  const [settings, setSettings] = useState<AppSettings>({...DEFAULT_SETTINGS, theme: initialTheme||'purple'});
  const [selectedTheme, setSelectedTheme] = useState(initialTheme||'purple');
  const [pendingTheme, setPendingTheme] = useState<string|null>(null);
  const [countdown, setCountdown] = useState(5);
  const [showCountdown, setShowCountdown] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setTimeout>|null>(null);
  const [activeAlert, setActiveAlert] = useState<{id:string|number;name:string;benefits:string;alarmTime:string}|null>(null);
  const [reminders, setReminders] = useState<{id:string|number;name:string;benefits:string;alarmTime:string}[]>([]);
  const clockRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_KEY);
        if (saved) setSettings(prev => ({...prev, ...JSON.parse(saved)}));
      } catch {}
    })();
  }, []);

  const saveSettings = useCallback(async (next: AppSettings) => {
    try { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        const { data } = await supabase.from('user_reminders')
          .select('id, name, benefits, alarm_time, is_active')
          .eq('user_id', session.user.id).eq('is_active', true);
        if (data) setReminders(data.map((r: any) => ({
          id: r.id, name: r.name??'Habit', benefits: r.benefits??'', alarmTime: r.alarm_time??'',
        })));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!settings.notifications) return;
    const check = () => {
      const now = new Date();
      const time24 = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const dayKey = now.toISOString().split('T')[0];
      for (const r of reminders) {
        let h = 0, m = 0;
        const clean = r.alarmTime.replace(/\s*(AM|PM)/i,'').trim();
        [h, m] = clean.split(':').map(Number);
        if (/PM/i.test(r.alarmTime) && h!==12) h+=12;
        if (/AM/i.test(r.alarmTime) && h===12) h=0;
        const alarm = `${String(h).padStart(2,'0')}:${String(m||0).padStart(2,'0')}`;
        const key = `${String(r.id)}-${dayKey}-${alarm}`;
        if (alarm===time24 && !firedRef.current.has(key)) {
          firedRef.current.add(key);
          setActiveAlert({id:r.id, name:r.name, benefits:r.benefits, alarmTime:r.alarmTime});
          break;
        }
      }
    };
    check();
    clockRef.current = setInterval(check, 30_000);
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, [settings.notifications, reminders]);

  useEffect(() => {
    if (showCountdown && countdown > 0) {
      countdownRef.current = setTimeout(() => setCountdown(c=>c-1), 1000);
    } else if (showCountdown && countdown === 0) {
      revertTheme();
    }
    return () => { if (countdownRef.current) clearTimeout(countdownRef.current); };
  }, [showCountdown, countdown]);

  const revertTheme = () => {
    setShowCountdown(false); setPendingTheme(null); setCountdown(5);
    onThemeChange?.(selectedTheme);
    Alert.alert('Reverted','Theme was reverted because it wasn\'t confirmed.');
  };

  const confirmTheme = () => {
    if (!pendingTheme) return;
    const next = {...settings, theme: pendingTheme};
    setSettings(next); setSelectedTheme(pendingTheme);
    setShowCountdown(false); setPendingTheme(null); setCountdown(5);
    saveSettings(next); onThemeChange?.(pendingTheme);
  };

  const selectTheme = (id: string) => {
    if (id===selectedTheme) return;
    setPendingTheme(id); setCountdown(5); setShowCountdown(true);
    onThemeChange?.(id);
  };

  const toggleSetting = (key: keyof AppSettings) => {
    const next = {...settings, [key]: !settings[key]};
    setSettings(next); saveSettings(next);
  };

  const handleAlertDone = async () => {
    if (!activeAlert) return;
    try {
      const r = reminders.find(x => x.id === activeAlert.id);
      if (r) await supabase.from('user_reminders').update({total_done:1}).eq('id',activeAlert.id);
    } catch {}
    Alert.alert('✅ Well done!',`"${activeAlert.name}" marked as completed!`);
    setActiveAlert(null);
  };

  const T = THEMES.find(t => t.id === selectedTheme) || THEMES[0];

  return (
    <View style={[S.container,{backgroundColor:T.background}]}>
      <View style={[S.header1,{backgroundColor:T.background}]}/>
      <View style={[S.header,{backgroundColor:T.secondary,borderBottomColor:T.primary+'44'}]}>
        <Text style={[S.title,{color:T.text}]}>Settings</Text>
        <Pressable onPress={onClose}><Icon name="times-circle" style={[S.closeIcon,{color:T.text}]}/></Pressable>
      </View>

      <ScrollView style={S.content} showsVerticalScrollIndicator={false}>

        {/* Theme Picker */}
        <View style={[S.section,{backgroundColor:T.card}]}>
          <Text style={[S.sTitle,{color:T.primary}]}>🎨 App Theme</Text>
          <Text style={S.sSub}>Choose a colour palette that feels right for you</Text>
          <View style={S.grid}>
            {THEMES.map(t => {
              const active = t.id === selectedTheme;
              return (
                <Pressable key={t.id} style={[S.themeCard,{backgroundColor:t.background,borderColor:active?t.primary:'#362c3a',borderWidth:active?2.5:1.5}]} onPress={()=>selectTheme(t.id)}>
                  <View style={[S.previewBar,{backgroundColor:t.primary}]}/>
                  <View style={[S.previewCardMini,{backgroundColor:t.card}]}>
                    <View style={[S.previewAccent,{backgroundColor:t.accent}]}/>
                  </View>
                  <Text style={S.themeEmoji}>{t.emoji}</Text>
                  <Text style={[S.themeName,{color:t.text}]} numberOfLines={1}>{t.name}</Text>
                  <Text style={[S.themeDesc,{color:t.primary}]} numberOfLines={2}>{t.desc}</Text>
                  {active && <View style={[S.check,{backgroundColor:t.primary}]}><Icon name="check" size={10} color="#fff"/></View>}
                </Pressable>
              );
            })}
          </View>

          {/* Live preview */}
          <View style={[S.preview,{backgroundColor:T.background,borderColor:T.primary+'55'}]}>
            <Text style={[S.previewLbl,{color:T.primary}]}>Live Preview</Text>
            <View style={[S.previewHdr,{backgroundColor:T.secondary}]}>
              <Icon5 name="heartbeat" size={13} color={T.primary}/>
              <Text style={[S.previewApp,{color:T.text}]}>FitLife</Text>
            </View>
            <View style={S.previewRow}>
              {[{l:'Calories',v:'1,850',c:T.primary},{l:'Burned',v:'320',c:T.accent},{l:'Goal',v:'2,000',c:'#4CAF50'}].map((s,i)=>(
                <View key={i} style={[S.previewStat,{backgroundColor:T.card}]}>
                  <Text style={[S.previewVal,{color:s.c}]}>{s.v}</Text>
                  <Text style={S.previewStatLbl}>{s.l}</Text>
                </View>
              ))}
            </View>
            <View style={[S.previewBtn,{backgroundColor:T.primary}]}>
              <Text style={S.previewBtnTxt}>Add to Intake</Text>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={[S.section,{backgroundColor:T.card}]}>
          <Text style={[S.sTitle,{color:T.primary}]}>🔔 Notifications</Text>
          {[
            {key:'notifications' as keyof AppSettings, icon:'bell',    label:'Habit Reminders',      desc:'Live alerts when a habit alarm time is reached'},
            {key:'cameraSound'   as keyof AppSettings, icon:'camera',  label:'Camera Capture Sound',  desc:'Shutter sound when capturing a food photo'},
            {key:'vibration'     as keyof AppSettings, icon:'mobile',  label:'Vibration',             desc:'Vibrate on alerts and interactions'},
          ].map(item=>(
            <View key={item.key} style={S.settingRow}>
              <View style={[S.settingIconCircle,{backgroundColor:T.primary+'22'}]}>
                <Icon name={item.icon} size={17} color={T.primary}/>
              </View>
              <View style={S.settingInfo}>
                <Text style={[S.settingLabel,{color:T.text}]}>{item.label}</Text>
                <Text style={S.settingDesc}>{item.desc}</Text>
              </View>
              <Switch value={!!settings[item.key]} onValueChange={()=>toggleSetting(item.key)}
                trackColor={{false:'#2a2335',true:T.primary+'88'}} thumbColor={settings[item.key]?T.primary:'#555'}/>
            </View>
          ))}

          {settings.notifications && (
            <View style={[S.statusBox,{borderColor:reminders.length>0?T.primary+'44':'#444'}]}>
              <Icon name={reminders.length>0?'bell':'bell-slash'} size={13} color={reminders.length>0?T.primary:'#555'}/>
              <Text style={[S.statusTxt,{color:reminders.length>0?T.primary:'#555'}]}>
                {reminders.length>0
                  ? `${reminders.length} active habit${reminders.length>1?'s':''} monitored — alerts fire at alarm time`
                  : 'No active reminders. Add habits in Reminders screen.'}
              </Text>
            </View>
          )}

          {settings.notifications && reminders.length>0 && (
            <View style={{marginTop:10}}>
              <Text style={[S.upcomingTitle,{color:T.primary}]}>Today's Alarms</Text>
              {reminders.slice(0,4).map((r,i)=>(
                <View key={i} style={S.alarmRow}>
                  <Icon name="bell" size={13} color={T.accent}/>
                  <Text style={[S.alarmTime,{color:T.accent}]}>{r.alarmTime}</Text>
                  <Text style={S.alarmName} numberOfLines={1}>{r.name}</Text>
                </View>
              ))}
              {reminders.length>4 && <Text style={S.alarmMore}>+{reminders.length-4} more habits</Text>}
            </View>
          )}
        </View>

        {/* About */}
        <View style={[S.section,{backgroundColor:T.card}]}>
          <Text style={[S.sTitle,{color:T.primary}]}>ℹ️ About FitLife</Text>
          <View style={[S.creatorCard,{backgroundColor:T.background,borderColor:T.primary+'55'}]}>
            <View style={[S.creatorAvatar,{backgroundColor:T.primary}]}>
              <Icon5 name="user-alt" size={22} color="#fff"/>
            </View>
            <View style={{flex:1}}>
              <Text style={S.creatorRole}>Created by</Text>
              <Text style={[S.creatorName,{color:T.primary}]}>Christian Jay P. Mamaril</Text>
              <Text style={S.creatorSub}>Developer & Designer</Text>
            </View>
          </View>

          {[
            {icon:'heartbeat',   label:'App Name',     val:'FitLife'},
            {icon:'code-branch', label:'Version',      val:'1.0.0'},
            {icon:'calendar-alt',label:'Date Created', val:'January 2025'},
            {icon:'mobile-alt',  label:'Platform',     val:'React Native (Expo)'},
            {icon:'database',    label:'Backend',      val:'Supabase'},
          ].map((item,i)=>(
            <View key={i} style={S.aboutRow}>
              <Icon5 name={item.icon} size={16} color={T.primary} style={S.aboutIcon}/>
              <View><Text style={S.aboutLbl}>{item.label}</Text><Text style={[S.aboutVal,{color:T.text}]}>{item.val}</Text></View>
            </View>
          ))}

          <View style={[S.appDescBox,{backgroundColor:T.background}]}>
            <Text style={[S.appDescTitle,{color:T.primary}]}>About this app</Text>
            <Text style={S.appDesc}>
              FitLife is a personal health companion built to help you track calories, log meals,
              monitor exercise, build lasting habits, and visualise your weekly progress — all in one place.
            </Text>
          </View>
        </View>

      </ScrollView>

      <CountdownModal visible={showCountdown}
        themeName={THEMES.find(t=>t.id===pendingTheme)?.name||''}
        countdown={countdown}
        primaryColor={THEMES.find(t=>t.id===pendingTheme)?.primary||'#c67ee2'}
        onConfirm={confirmTheme} onCancel={revertTheme}/>

      {activeAlert && (
        <HabitAlertModal visible={true}
          habitName={activeAlert.name} benefits={activeAlert.benefits} alarmTime={activeAlert.alarmTime}
          onDone={handleAlertDone} onDismiss={()=>setActiveAlert(null)}/>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container:{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:400},
  header1:{height:35},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:20,paddingVertical:15,borderBottomWidth:1},
  title:{fontSize:24,fontWeight:'bold',color:'#fff'},
  closeIcon:{fontSize:30,color:'#fff'},
  content:{flex:1,padding:15},
  section:{borderRadius:16,padding:16,marginBottom:15},
  sTitle:{fontSize:17,fontWeight:'800',marginBottom:4},
  sSub:{fontSize:12,color:'#666',marginBottom:14},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:16},
  themeCard:{width:'47%',borderRadius:14,padding:10,gap:4,overflow:'hidden',position:'relative'},
  previewBar:{height:6,borderRadius:3,marginBottom:4},
  previewCardMini:{height:28,borderRadius:6,padding:4,justifyContent:'flex-end'},
  previewAccent:{height:6,width:'60%',borderRadius:3},
  themeEmoji:{fontSize:20,marginTop:4},
  themeName:{fontSize:13,fontWeight:'700'},
  themeDesc:{fontSize:10,lineHeight:13},
  check:{position:'absolute',top:8,right:8,width:20,height:20,borderRadius:10,alignItems:'center',justifyContent:'center'},
  preview:{borderRadius:12,padding:12,borderWidth:1,gap:8,marginTop:4},
  previewLbl:{fontSize:11,fontWeight:'700',textTransform:'uppercase',letterSpacing:0.5},
  previewHdr:{flexDirection:'row',alignItems:'center',gap:8,padding:8,borderRadius:8},
  previewApp:{fontSize:13,fontWeight:'700'},
  previewRow:{flexDirection:'row',gap:8},
  previewStat:{flex:1,borderRadius:10,padding:10,alignItems:'center',gap:2},
  previewVal:{fontSize:15,fontWeight:'800'},
  previewStatLbl:{fontSize:9,color:'#888'},
  previewBtn:{borderRadius:10,paddingVertical:9,alignItems:'center'},
  previewBtnTxt:{fontSize:13,fontWeight:'700',color:'#fff'},
  settingRow:{flexDirection:'row',alignItems:'center',paddingVertical:12,gap:12,borderBottomWidth:1,borderBottomColor:'#2a2335'},
  settingIconCircle:{width:36,height:36,borderRadius:10,alignItems:'center',justifyContent:'center'},
  settingInfo:{flex:1},
  settingLabel:{fontSize:15,fontWeight:'700'},
  settingDesc:{fontSize:11,color:'#666',marginTop:1},
  statusBox:{flexDirection:'row',alignItems:'center',gap:8,marginTop:10,padding:10,borderRadius:10,borderWidth:1,backgroundColor:'rgba(0,0,0,0.2)'},
  statusTxt:{fontSize:12,fontWeight:'600',flex:1},
  upcomingTitle:{fontSize:12,fontWeight:'700',marginBottom:6,textTransform:'uppercase',letterSpacing:0.4},
  alarmRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:8,borderBottomWidth:1,borderBottomColor:'#362c3a'},
  alarmTime:{fontSize:13,fontWeight:'700',width:72},
  alarmName:{fontSize:13,color:'#ccc',flex:1},
  alarmMore:{fontSize:11,color:'#555',fontStyle:'italic',marginTop:4},
  creatorCard:{flexDirection:'row',alignItems:'center',gap:14,padding:14,borderRadius:14,borderWidth:1,marginBottom:14},
  creatorAvatar:{width:52,height:52,borderRadius:26,alignItems:'center',justifyContent:'center'},
  creatorRole:{fontSize:11,color:'#666'},
  creatorName:{fontSize:16,fontWeight:'800'},
  creatorSub:{fontSize:12,color:'#888'},
  aboutRow:{flexDirection:'row',alignItems:'center',paddingVertical:11,borderBottomWidth:1,borderBottomColor:'#2a2335',gap:14},
  aboutIcon:{width:22},
  aboutLbl:{fontSize:11,color:'#666'},
  aboutVal:{fontSize:14,fontWeight:'700'},
  appDescBox:{borderRadius:12,padding:14,marginTop:10},
  appDescTitle:{fontSize:12,fontWeight:'700',textTransform:'uppercase',letterSpacing:0.4,marginBottom:6},
  appDesc:{fontSize:13,color:'#888',lineHeight:20},
});