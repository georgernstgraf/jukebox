# jukebox

Web-Based jukebox for a local Music Directory

## Tech-Stack

- typescript / node / prisma
- handlebars templating engine on the backend
- custom-written saslauthd authentication
- bootstrap in combo with purgecss (works nicely!!)
- handling of browser sessions (custom!)

## musings on session and cookie in the middleware

"A Session is always device (and even browser) specific"

```code
session.gotLogin: boolean
session.gotLogout: boolean
session.needsSave: boolean
```

### BEFORE

| sessId (cookie) | memcache | what to do |
|:-:|:-:|:-:|
|✅|✅|normal Session|
|✅|❌|cannot find memcache, Server dictates new sessId|
|❌|✅|new sessId, new cookie (memcache auto evict, will never find again)|
|❌|❌|new sessId, new cookie|

### AFTER LOGIN (during next())

session.username is beeing set, meaning:

- send cookie (/login onto a working session is not quite realistic, but resending
a known cookie again is ok)
- save to memcached

### AFTER LGOUT (during next())

- destroy cookie
- remove from memcached, if it came from it.

### AFTER MODS (during next())

- save to memcache

### AFTER nothing

- do nothing

## Notes on syncing

- Path insertion is fast (by `processListingFile()`)
- after this, most files are still correct

### Verify all Tracks - need to `stat()` all: YES

- DB View: some files do not exist on filesystem anymore (thru picard)
- DB View: some files on filesystem are newer (tags & sha256 needs regeneration)

### setting inode to NULL

I now get files with

- verifiedAt NULL or a date

`verifiedAt` .. timestamp of last full verification

`inode`, `sizeBytes` .. comes thru `stat`

`ext`, `mimeType` .. comes thru bufferMimeType
