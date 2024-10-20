
const ytgets = require('yt-gets');

ytgets.fetch('https://www.youtube.com/watch?v=gG3pytAY2MY').then((data)=>{
    console.log(data)
	console.info(data?.media?.video);
}).catch((err)=>{
    console.log(err)
})

