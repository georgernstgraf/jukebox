#!/bin/sh
echo "select 'inodes: ', count() from track where inode is not null union all select 'nulles: ', count() from track where inode is null;" | sqlite3 music.db

