const ytdl = require('@distube/ytdl-core');
const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query.q || req.query.url;

  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'অনুগ্রহ করে গানের নাম অথবা ইউটিউব লিংক প্রদান করুন!',
    });
  }

  try {
    let videoUrl = query;

    // যদি ইনপুটে কোনো সরাসরি ইউটিউব লিংক না থাকে, তবে ইউটিউবে সার্চ করে প্রথম ভিডিওটি বের করা
    if (!ytdl.validateURL(query)) {
      // ইউটিউব সার্চের জন্য একটি সহজ মেথড ব্যবহার করা যেতে পারে অথবা কোনো সার্চ এপিআই
      // এখানে ইউটিউব থেকে ডাইরেক্ট ইনফো নেওয়ার জন্য আমরা একটি পপুলার সার্চ এপ্রোচ বা ইউটিউব সার্চ প্যাকেজ ব্যবহার করতে পারি।
      // সহজ সমাধানের জন্য নিচের সার্চ এপিআই ব্যবহার করতে পারেন বা ytdl দিয়ে সরাসরি হ্যান্ডেল করতে পারেন।
      
      // বিকল্প হিসেবে নিচের থার্ড-পার্টি বা ইনবিল্ট সার্চ ব্যবহার করতে পারেন:
      const searchRes = await axios.get(`https://api.siputzx.my.id/api/s/youtube?query=${encodeURIComponent(query)}`);
      const searchResults = searchRes.data?.data;

      if (!searchResults || searchResults.length === 0) {
        return res.status(404).json({ success: false, message: 'কোনো গান খুঁজে পাওয়া যায়নি।' });
      }

      videoUrl = searchResults[0].url; // প্রথম ভিডিওর লিংক নেওয়া হলো
    }

    // ভিডিওর তথ্য এবং অডিও ফরম্যাট সংগ্রহ করা
    const info = await ytdl.getInfo(videoUrl);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

    if (audioFormats.length === 0) {
      return res.status(404).json({ success: false, message: 'এই গানটির অডিও ফরম্যাট পাওয়া যায়নি।' });
    }

    const bestAudio = audioFormats[0];
    const videoDetails = info.videoDetails;

    return res.status(200).json({
      success: true,
      result: {
        title: videoDetails.title,
        duration: formatDuration(videoDetails.lengthSeconds),
        author: videoDetails.author.name,
        views: videoDetails.viewCount,
        thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1].url,
        url: videoDetails.video_url,
        downloadUrl: bestAudio.url, // ডাইরেক্ট অডিও লিংক
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      message: 'সার্ভারে ত্রুটি ঘটেছে: ' + error.message,
    });
  }
};

// সেকেন্ডকে মিনিট:সেকেন্ড ফরম্যাটে রূপান্তর করার ফাংশন
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}
