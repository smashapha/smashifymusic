UPDATE user_profiles
SET subscription_tier = 'DailyPass',
    subscription_expires_at = (NOW() + INTERVAL '1 day')
WHERE email = 'smashtherealmuzic@gmail.com';
