# jukebox

wu mp3 collection

## Getting the db ready

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
