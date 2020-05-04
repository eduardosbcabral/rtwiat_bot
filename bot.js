const config = require('./config');

const { loadImage, createCanvas } = require('canvas')

const Twit = require('twit');
const T = new Twit(config);

const BOT_USERNAME_WAT = 'rtwiatBot';
const BOT_USERNAME = '@rtwiatBot';
const REGEX_USERNAME = new RegExp(BOT_USERNAME);

main = () => {
    getMentions(tweet => {
        let tweet_id = tweet.id_str;
        let tweet_user = tweet.user.screen_name;
        let id_replied_tweet = tweet.in_reply_to_status_id_str;
        console.log('Passo 1: Identificacao da mencao ao Bot');
        let user_id_to_get_profile_image = tweet.entities.user_mentions.find((x, i) => i !== 0 && x.screen_name !== BOT_USERNAME_WAT);
        if(!user_id_to_get_profile_image) {
            console.log('ERRO: BOT MENCIONADO');
            return;
        }

        user_id_to_get_profile_image = user_id_to_get_profile_image.id_str;

        getUser(user_id_to_get_profile_image, (err, data, response) => {
            let profile_image_url = data.profile_image_url.replace('_normal', '_400x400');
            console.log('Passo 2: Recuperar usuario que foi marcado');
            getTweet(id_replied_tweet, (err, data, response) => {
                let text_replied_tweet = data.full_text;
                console.log('Passo 3: Recuperar tweet respondido marcando o bot');
                loadImage(profile_image_url)
                .then(image => {
                    console.log('Passo 4: Inicio da edição da imagem');
                    const canvas = createCanvas(400, 400);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(image, 0, 0);

                    let lines = getLines(ctx, text_replied_tweet, 360);
                    ctx.font = setFontSizeBasedOnLinesLength(lines.length);
                    ctx.textBaseline = 'middle'; 
                    ctx.textAlign = 'center'; 

                    lines.forEach((line, i) => {
                        drawTextBG(ctx, line, ctx.font, canvas.width / 2, ((canvas.height / 2) + ((canvas.height / 2) * 20 / 100) + (i * (parseInt(ctx.font, 10) + 5))), canvas);
                    });

                    let b64Content = canvas.toDataURL().split(',')[1];
                    console.log('Passo 5: Termino da edicao da imagem');

                    uploadMedia(b64Content, (err, data, response) => {
                        const media_id = data.media_id_string
                        const params = {
                            status: `@${tweet_user}`,
                            in_reply_to_status_id: tweet_id,
                            media_ids: [media_id]
                        };
                        postTweet(params, () => {console.log('Passo 7: Tweetar imagem');});
                    });
                })
                .catch(err => {
                    console.log('oh no!', err)
                });
            });
        });
    });
}

getMentions = (callback) => {
    var stream = T.stream('statuses/filter', { track: [BOT_USERNAME] });
    stream.on('tweet', callback);
}

getTweet = (id, callback) => {
    T.get('statuses/show/:id', { id: id, tweet_mode: 'extended' }, callback);
}

postTweet = (params, callback) => {
    T.post('statuses/update', params, callback);
}

destroyTweet = (id, callback) => {
    T.post('statuses/destroy/:id', { id: id }, callback);
}

getUser = (id, callback) => {
    T.get('users/show', { user_id: id }, callback);
}

uploadMedia = (b64Content, callback) => {
    T.post('media/upload', { media_data: b64Content }, callback);
}

drawTextBG = (ctx, txt, font, x, y, canvas) => {

    /// lets save current state as we make a lot of changes        
    ctx.save();

    /// set font
    ctx.font = font;

    /// draw text from top - makes life easier at the moment
    ctx.textBaseline = 'top';

    /// color for background
    ctx.fillStyle = '#000000B3';

    /// get width of text
    var width = ctx.measureText(txt).width;

    var remainingSpace = canvas.width - width;

    /// draw background rect assuming height of font
    ctx.fillRect(remainingSpace/2 - 5, y, width + 10, parseInt(font, 10) + 5);

    /// text color
    ctx.fillStyle = '#FFFFFFCC';

    /// draw text on top
    ctx.fillText(txt, x, y);

    /// restore original state
    ctx.restore();
}

getLines = (ctx, text, maxWidth) => {
    var words = text.split(" ");
    var lines = [];
    var currentLine = words[0];

    if(words.length > 1) {
        for (var i = 1; i < words.length; i++) {
            var word = words[i];
            ctx.font = setFontSizeBasedOnLinesLength(i);
            var width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
    } else if(ctx.measureText(currentLine).width > maxWidth) {
        let splitLength = Math.ceil(ctx.measureText(currentLine).width / maxWidth);
        for (var i = 0; i <= splitLength; i++) {
            var word = currentLine.slice(i * 40, (i+1) * 40) + '-';
            lines.push(word);
        }
    }
    
    return lines;
}

setFontSizeBasedOnLinesLength = (length) => {
    if(length === 1) return '22px Arial';
    if(length === 2) return '22px Arial';
    if(length === 3) return '22px Arial';
    if(length === 4) return '16px Arial';
    if(length === 5) return '16px Arial';
    if(length === 6) return '16px Arial';
    if(length === 7) return '16px Arial';
    return '15px Arial';
}

main();