UPDATE health_status
SET checked_at = CAST(strftime('%s', checked_at) AS INTEGER) * 1000
WHERE typeof(checked_at) = 'text'
  AND checked_at LIKE '%-%';
