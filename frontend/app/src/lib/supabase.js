import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xztrjjveapihqqbsgjwk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6dHJqanZlYXBpaHFxYnNnandrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNjY1MjksImV4cCI6MjA2OTY0MjUyOX0.wYvCZq4M7VKSmBuN-4CqyHWskqb_oOKqD76YIr3iOx4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
