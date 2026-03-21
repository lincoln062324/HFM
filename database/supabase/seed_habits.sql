-- Seed habits data (from dashboard.tsx HABIT_LIST)
INSERT INTO habits (name, benefits) VALUES
('Eat more protein', 'Builds muscle, supports metabolism, promotes satiety.'),
('Drink more water', 'Hydrates the body, improves digestion, boosts energy.'),
('Eat more fruit', 'Provides vitamins, antioxidants, supports immune health.'),
('Eat more vegetables', 'Rich in fiber, vitamins, reduces disease risk.'),
('Log a daily meal', 'Tracks nutrition, promotes mindful eating, aids weight management.'),
('Eat more fiber', 'Improves digestion, regulates blood sugar, supports heart health.'),
('Get more exercise', 'Strengthens muscles, improves cardiovascular health, boosts mood.'),
('Drink less alcohol', 'Reduces liver strain, improves sleep, supports weight loss.'),
('Reduce added sugar', 'Lowers calorie intake, improves dental health, stabilizes energy.')
ON CONFLICT DO NOTHING;

