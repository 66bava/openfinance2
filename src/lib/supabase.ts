import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cccptybngvodtbuetjvl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjY3B0eWJuZ3ZvZHRidWV0anZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjI5MzYsImV4cCI6MjA5MTkzODkzNn0.S_zKIYXXF87va382sic29sLcXP_GUuhNPsVslE-yjsM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
