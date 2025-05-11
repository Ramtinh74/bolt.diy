-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT,
  avatar TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  subscription_id TEXT,
  stripe_customer_id TEXT,
  usage_credits INTEGER DEFAULT 10,
  usage_limit INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_logs table
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  credits_used INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create RLS policies for usage_logs
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage logs"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, subscription_tier, subscription_status, usage_credits, usage_limit)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1),
    'free',
    'active',
    10,
    10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update usage credits
CREATE OR REPLACE FUNCTION public.update_usage_credits()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET usage_credits = usage_credits - NEW.credits_used
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for usage logs
CREATE OR REPLACE TRIGGER on_usage_log_created
  AFTER INSERT ON public.usage_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_usage_credits();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_action_type ON usage_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);