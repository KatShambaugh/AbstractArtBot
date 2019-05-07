/*
Note: this script uses the Node.js modules request, wordfilter, twit, fs, and path
*/

var debug = false;

//Wordnik Connection
var WordnikAPIKey = '64d6d8b4d09d3f6e3e028db31f50b593b26544667e5726fd6';
var request = require('request');
var replyPhrases;		//pre-made reply phrases
var images = [];
var attribution;
var tweetText = "";

//Word Filter
var wordfilter = require('wordfilter');

//Twitter Connection
var Twitter = require('twit');
var T = new Twitter(require('./config.js'));

//File Upload Connection
var fs = require('fs'),
    path = require('path'),
    config = require(path.join(__dirname, 'config.js'));

//Picks random item from array, pulled from sample code
Array.prototype.pick = function() {
	return this[Math.floor(Math.random()*this.length)];
}

//Removes item from array, pulled from sample code
Array.prototype.remove = function() {
    var removed, a = arguments, L = a.length, ax;
    while (L && this.length) {
        removed = a[--L];
        while ((ax = this.indexOf(removed)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
}

//Wordnik authentication / receives words
function wordURL(minCorpusCount, limit) {
	return "http://api.wordnik.com/v4/words.json/randomWords?hasDictionaryDef=false&minCorpusCount="  + minCorpusCount + "&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=5&maxLength=-1&limit=" + limit + "&api_key=" + WordnikAPIKey;
}

//Uploads a random image to Twitter media and posts the tweet
function upload_random_image(images) {
	console.log('Opening an image...');
	var filename = images.pick(),
		image_path = path.join(__dirname, '/images/' + filename),
		b64content = fs.readFileSync(image_path, { encoding: 'base64' });

	attribution = filename.substring(6, filename.lastIndexOf("-"));		//pulls UnSplash username from image title
  	tweetText = tweetText + "\nArt by " + attribution + " on UnSplash" + "\n#abstractart #art";	//using hashtags to increase awareness
  	
  	console.log('Uploading an image...');
  	T.post('media/upload', { media_data: b64content }, function (err, data, response) {		//uploads the image to Twitter media
    	if (err){
      		console.log('ERROR:');
      		console.log(err);
    	} else {
      		console.log('Image uploaded!');
      		console.log('Now tweeting it...');
      		
      		if (debug) {
				console.log('Debug mode: ', tweetText);
			} else {
				T.post('statuses/update', { status: tweetText, media_ids: new Array(data.media_id_string) }, function(err, data, response) {	//posts tweet
          			if (err){
            			console.log('ERROR:');
            			console.log(err);
          			} else {
            			console.log('Posted tweet!');
          			}
        		});
			}
		}	
    });
}

//Prepares to post a tweet
function tweet() {
	request(wordURL(5000, 200), function(err, response, data) {
		if (err != null) {
			return;
		}
		words = eval(data);

		for (var i = 0; i < words.length; i++) {
			if (wordfilter.blacklisted(words[i].word)) {
				words.remove(words[i]);
				i--;
			}
		}
		for (var i = 0; i <= Math.random()*5; i++) {
			tweetText = words.pick().word + " " + tweetText;
		}	
		upload_random_image(images);
	});
}

function followAMentioner() {
	T.get('statuses/mentions_timeline', { count: 10, include_rts:1 }, function(err, reply) {
		if (err != null) {
				console.log('Error: ', err);
		} else {
			var follow = reply.pick();
			if (follow != undefined) {
				var username = follow.user.screen_name;
				if (debug) {
					console.log(username);
				} else {
					T.post('friendships/create', {screen_name: username}, function(err, reply) {
						if (err != null) {
							console.log('Error: ', err);
						} else {
							console.log('Followed: ' + username);
						}
					});
				}	
			}	
		}
	});
}

function respondToMention() {
	T.get('statuses/mentions_timeline', { count: 50, include_rts:1 }, function(err, reply) {
		if (err != null) {
				console.log('Error: ', err);
		} else {
			mention = reply.pick();
			if (mention != undefined) {
				mentionId = mention.id_str;
				mentioner = '@' + mention,user.screen_name;

				var tweet = mentioner + " " + replyPhrases.pick();
				if (debug) {
					console.log(tweet);
				} else {
					T.post('statuses/update', {status: tweet, in_reply_to_status_id: mentionId }, function(err, reply) {
						if (err != null) {
							console.log('Error: ', err);
						} else {
							console.log('Followed: ' + username);
						}	
					});
				}
			}
		}
	});
}

function runBot() {
	console.log(" ");
	var date = new Date();
	var dateString = date.toLocaleDateString() + " " + date.toLocaleTimeString();
	console.log(dateString);
	tweetText = "";

	replyPhrases = [
		"Thank you!",
		"Life imitates art",
		"Art imitates life",
		"This is the true meaning of art",
		"Try again",
		"Look closer",
		"Art is what you make of it"];

	fs.readdir(__dirname + "/images", function(err, files) {
  		if (err){
    		console.log(err);
  		} else {
    		files.forEach(function(f) {
      			images.push(f);
    		});
    	}
	});

	var rand = Math.random();
	if(rand <= 1.60) {      
		console.log("-------Tweet something");
		tweet();
	}
	if (rand <= 0.80) {
		console.log("-------Tweet something @someone");
		respondToMention();
	} else {
		console.log("-------Follow someone who @-mentioned us");
		followAMentioner();
	}
}

// Run the bot
runBot();

// And recycle every half hour
setInterval(runBot, 1000 * 60 * 30);