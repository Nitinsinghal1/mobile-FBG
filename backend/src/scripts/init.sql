-- Four Worlds Battleground Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(64) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Profiles table (linked to users, one-to-many)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  codename VARCHAR(32) NOT NULL,
  power_id VARCHAR(32) NOT NULL,
  mode VARCHAR(16) NOT NULL,
  instinct VARCHAR(32),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, codename)
);

-- Progression table
CREATE TABLE IF NOT EXISTS progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  world_id VARCHAR(32),
  worlds_conquered INT DEFAULT 0,
  damage_done INT DEFAULT 0,
  monsters_defeated INT DEFAULT 0,
  deaths INT DEFAULT 0,
  leaderboard_score INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Leaderboard table (denormalized for fast queries)
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  username VARCHAR(64) NOT NULL,
  score INT NOT NULL DEFAULT 0,
  worlds_conquered INT DEFAULT 0,
  rank_global INT,
  rank_region VARCHAR(32),
  season INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Game saves table
CREATE TABLE IF NOT EXISTS game_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  state_data JSONB NOT NULL,
  checksum VARCHAR(64),
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_codename ON profiles(codename);
CREATE INDEX IF NOT EXISTS idx_progression_profile_id ON progression(profile_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_season_score ON leaderboard(season, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_region_score ON leaderboard(rank_region, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_profile_id ON leaderboard(profile_id);
CREATE INDEX IF NOT EXISTS idx_game_saves_profile_id ON game_saves(profile_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_time ON chat_messages(room, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progression_updated_at BEFORE UPDATE ON progression
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_saves_updated_at BEFORE UPDATE ON game_saves
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
