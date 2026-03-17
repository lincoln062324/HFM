import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gsahrltdhnvxezqbjhnk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzYWhybHRkaG52eGV6cWJqaG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODU2MjAsImV4cCI6MjA4OTA2MTYyMH0.vW9VdU2SUIUcxB6oZEp88MJ1CMoQTn-7_FVA-s7CtZ8'


const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default supabase