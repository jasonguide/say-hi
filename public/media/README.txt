把音标教学视频命名为 ipa-lesson.mp4 放在这个目录里，音标页的「教学视频」区就会自动播放。

路径： public/media/ipa-lesson.mp4
访问： http://<你的服务器>/media/ipa-lesson.mp4

说明：
- 只支持 mp4（H.264 + AAC），浏览器原生 <video> 直接拷放，不做转码。
- 没有这个文件时，页面会显示「还没放视频」的提示，不会出现黑框。
- 想换文件名或放多集，改 public/ipa.html 里 <video src="..."> 即可。
