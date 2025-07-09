-- TEST
SELECT path,
    CASE
        WHEN path LIKE '/home/www/mp3/%'
        THEN '/home/www/Music/' || substr(path, LENGTH('/home/www/mp3/') + 1)
        ELSE path
    END AS new_path
FROM track;

-- do it actually
UPDATE track
SET path =
    CASE
        WHEN path LIKE '/home/www/mp3/%'
        THEN '/home/www/Music/' || substr(path, LENGTH('/home/www/mp3/') + 1)
        ELSE path
    END
WHERE path LIKE '/home/www/mp3/%';
