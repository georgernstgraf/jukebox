-- how many are verified
SELECT 'verified:', count() FROM track WHERE verifiedat IS NOT NULL UNION ALL SELECT 'unverified:', count() FROM track WHERE verifiedat IS NULL UNION ALL SELECT 'total:', count() FROM track;

-- missing artist in tag
SELECT  path FROM track WHERE verifiedat IS NOT NULL AND mimetype LIKE 'audio/%' AND artist IS NULL LIMIT 21 OFFSET 21;

-- sha256sums
SELECT sha256, path, COUNT(sha256) AS occurences FROM track GROUP BY sha256 HAVING COUNT(sha256) > 2 ORDER BY occurences ASC;

-- searchby path
SELECT
 path
FROM
 track
WHERE
 path LIKE '%solokantaten%';
