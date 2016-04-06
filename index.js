'use strict';

if (!process.argv[2]) {
  throw new Error('You must provide a screen_name');
}

const fs = require('fs');
const Readable = require('stream').Readable;

const Long = require('long');
const Twitter = require('twitter');

const file = fs.createWriteStream('tweets.txt');
const Stream = require('stream');
const stream = new Stream;
stream.readable = true;

var client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

const getTweets = function(max_id, callback) {
  const endpoint = 'statuses/user_timeline';
  let params = {screen_name: process.argv[2], count: 100};
  if (max_id !== undefined) {
    params.max_id = max_id
  }

  client.get(endpoint, params, (err, results, res) => {
    if (err) {
      console.log('error:', err);
    }

    let maxId = (max_id !== undefined) ? max_id : results[0].id_str;
    results.forEach((tweet) => {
      if (!tweet.retweeted) {
        stream.emit('data', tweet.text);
        stream.emit('data', '\n');
      }

      if (Long.fromString(tweet.id_str).lessThan(Long.fromString(maxId))) {
        maxId = Long.fromString(tweet.id_str).subtract(1).toString();
      }
    });
    callback(maxId);
  });
};

const getAllTweets = function(maxId) {
  getTweets(maxId, (newMaxId) => {
    if (maxId !== newMaxId) {
      getAllTweets(newMaxId);
    } else {
      stream.emit('end');
    }
  });
};

getAllTweets(undefined);

stream.pipe(process.stdout);
stream.pipe(file);

