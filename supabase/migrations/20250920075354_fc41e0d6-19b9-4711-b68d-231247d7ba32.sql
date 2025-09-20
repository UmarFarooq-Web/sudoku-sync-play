-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  is_private BOOLEAN DEFAULT false,
  password TEXT,
  puzzle JSONB NOT NULL,
  solution JSONB NOT NULL,
  current_board JSONB NOT NULL DEFAULT '{}',
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Create policies for rooms
CREATE POLICY "Public rooms are viewable by everyone" 
ON public.rooms 
FOR SELECT 
USING (NOT is_private OR auth.uid() = host_id);

CREATE POLICY "Users can create rooms" 
ON public.rooms 
FOR INSERT 
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update their own rooms" 
ON public.rooms 
FOR UPDATE 
USING (auth.uid() = host_id);

-- Create moves table
CREATE TABLE public.moves (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  row INT NOT NULL CHECK (row >= 0 AND row < 9),
  col INT NOT NULL CHECK (col >= 0 AND col < 9),
  value INT NOT NULL CHECK (value >= 1 AND value <= 9),
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for moves
ALTER TABLE public.moves ENABLE ROW LEVEL SECURITY;

-- Create policies for moves
CREATE POLICY "Moves are viewable by everyone in room" 
ON public.moves 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create moves" 
ON public.moves 
FOR INSERT 
WITH CHECK (auth.uid() = player_id);

-- Create messages table
CREATE TABLE public.messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Messages are viewable by everyone" 
ON public.messages 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = player_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Set up realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;