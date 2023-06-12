## Lambda folder

Here, it contains a `.production` folder from a built Nullstack App. But there is a catch. I removed the `.cache` folder in it and edited the `server.js` file too.
What I did was:
1. Catch the tags with crossorigin="anonymous"
2. Removed the entire attribute, leaving it without the crossorigin="anonymous"

There is an index.js file, the file that will be ran in the lambda. In short, it gets the express server from Nullstack, sets `server.less = true;` if there is no process.env.LAMBDA in it (for tests purposes).

You can also add the public folder. Nothing will break, but that's an extra call to your lambda you may want to avoid. Plus, just using the s3 can be faster because of cache.