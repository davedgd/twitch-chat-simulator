/* establish globals */
var ChatUpdateInterval // chat controller refresh interval
var VideoDuration // video duration
var ChatsToPrint
var TaskVideo = document.getElementById("startVideo")

/* start video (manual) */
function StartVideo() {
    TaskVideo.play()
    $('#StartVideo').hide()
}

/* toggle chat */
function ToggleChat() {
    $(chatBar).toggle()
}

/* end of video */
function VideoEnded () {
    console.log('Video ended!')
    VideoPlaying = false
    clearInterval(ChatUpdateInterval)
    var targetOrigin = "*";
    window.parent.postMessage({
        "message": "VIDEO ENDED (ENABLING NEXT BUTTON)",
    }, targetOrigin)
}

/* get settings */

// https://www.sitepoint.com/get-url-parameters-with-javascript/
const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)

if (urlParams.has('VideoID'))
    VideoID = urlParams.get('VideoID')
else
    VideoID = ''

if (urlParams.has('ShowChat'))
    ShowChat = eval(urlParams.get('ShowChat'))
else
    ShowChat = false

if (urlParams.has('ChatRate'))
    ChatRate = urlParams.get('ChatRate')
else
    ChatRate = 1

// https://api.jquery.com/jquery.getjson/

$.ajax({
    url: "assets/clips/" + VideoID + ".json",
    dataType: "json",
  }).done(json => ReadEmotesAndBadges(json))

function ReadEmotesAndBadges (ChatData) {
    $.ajax({
        url: "assets/clips/" + ChatData['streamer']['id'] + "_badges_and_emotes.json",
        dataType: "json"
      }).done(json => MainTask(ChatData, json))
}

function MainTask(ChatData, BadgesAndEmotes) {

    /* set up badges and emotes */
    Badges = BadgesAndEmotes['badgesAll']
    Emotes = BadgesAndEmotes['emotesAll']

    /* define clip start time */
    let ClipStartTime = VideoID.split('_')[VideoID.split('_').length - 1].split('.')[0]
    let ChatCount = Object.keys(ChatData['comments']).length

    /* preload user badges and emotes*/
    var CollectPreloadBadges = []
    var CollectPreloadEmotes = []

    for (i = 0; i < ChatCount; i++) {

        // find badges
        var UserBadges = ChatData['comments'][i]['message']['user_badges']
        var BadgeCount = 0

        if (UserBadges !== null) {
            BadgeCount = UserBadges.length

            for (j = 0; j < BadgeCount; j++)
                CollectPreloadBadges.push(Badges.filter(a => a.set_id == UserBadges[j]._id)[0]['versions'].filter(a => a.id == UserBadges[j].version)[0]['image_url_1x'].replace('https://static-cdn.jtvnw.net/badges/v1/', '').replace('/1', '.png'))
        }

        // find emotes
        var UserEmotes = ChatData['comments'][i]['message']['emoticons']

        if (UserEmotes !== null) {
            EmoteCount = UserEmotes.length

            for (j = 0; j < EmoteCount; j++)
                CollectPreloadEmotes.push(UserEmotes[j]._id + '.png')
        }

    }

    var PreloadBadges = [... new Set(CollectPreloadBadges)]
    var PreloadEmotes = [... new Set(CollectPreloadEmotes)]

    loadDiv = document.getElementById('loadEmotesAndBadges')

    // preload badges
    for (i = 0; i < PreloadBadges.length; i++)
        loadDiv.innerHTML += '<img src="assets/badges/' + PreloadBadges[i] + '" class = "hiddenEmotesAndBadges">'

    // preload emotes
    for (i = 0; i < PreloadEmotes.length; i++)
        loadDiv.innerHTML += '<img src="assets/emotes/' + PreloadEmotes[i] + '" class = "hiddenEmotesAndBadges">'

    console.log('Preloaded emotes and badges!')
    
    /* create array of offset chat times */
    var ChatTimes = []
    for (i = 0; i < ChatCount; i++) {
        ChatTimes.push(ChatData['comments'][i]['content_offset_seconds'] - ClipStartTime)
    }

    /* create array of chat playback status */
    ChatPlaybackStatus = Array(ChatTimes.length).fill(false)
    
    /* assign user chat color */
    var ChatUsers = []
    for (i = 0; i < ChatCount; i++) {
        ChatUsers.push(ChatData['comments'][i]['commenter']['display_name'])
    }
    ChatUsers = Array.from(new Set(ChatUsers))

    /* twitch chat colors */
    ColorOptions = ["Blue", "Coral", "DodgerBlue", "SpringGreen", "YellowGreen", "Green", "OrangeRed", "Red", "GoldenRod", "HotPink", "CadetBlue", "SeaGreen", "Chocolate", "BlueViolet", "Firebrick"]
    
    /* randomize user colors */
    UserColors = []
    for (i = 0; i < ChatUsers.length; i++)
        UserColors.push(ColorOptions[Math.floor(Math.random() * ColorOptions.length)])
    
    /* video id */
    const videoStream = TaskVideo
    
    /* disable chat scroll */
    document.getElementById('chatText').onwheel = function() { return false }
    
    /* print chat */
    function PrintChat(ChatIndex) {
    
        var Chat = ChatData['comments'][ChatIndex]
        var User = Chat['commenter']['display_name']
        var Message = Chat['message']['body']
        var Time = new Date(Chat['content_offset_seconds'] * 1000).toISOString().substr(11, 8)
        if (Time.charAt(0) == '0') Time = Time.substring(1)
        var UserColor = UserColors[ChatUsers.indexOf(User)]
        var UserBadges = Chat['message']['user_badges']
        var Emoticons = Chat['message']['emoticons']

        UserBadgeDisplay = ''
        if (UserBadges !== null) {

            for (j = 0; j < UserBadges.length; j++) {
                var BadgeData = ChatData['comments'][ChatIndex]['message']['user_badges'][j]
                var BadgeImage = Badges.filter(a => a.set_id == BadgeData._id)[0]['versions'].filter(a => a.id == BadgeData.version)[0]['image_url_1x']
                BadgeImageLocal = 'assets/badges/' + BadgeImage.replace('https://static-cdn.jtvnw.net/badges/v1/', '').replace('/1', '.png')
                UserBadgeDisplay += `<img class="badgeIcon" src="${BadgeImageLocal}">`
            }
        }

        if (Emoticons !== null) {

            AppendedLength = 0
            for (j = 0; j < Emoticons.length; j++) {
                //console.log(Message)
                //console.log(Emoticons[j])

                EmoteHTML = '<img class="emote" src="assets/emotes/' + Emoticons[j]._id + '.png">'
                var EmoteMessage = Message.substring(0, Emoticons[j].begin + AppendedLength) + EmoteHTML + Message.substring(Emoticons[j].end + AppendedLength + 1)
                AppendedLength += EmoteHTML.length - (Emoticons[j].end - Emoticons[j].begin + 1)
    
                Message = EmoteMessage
            
            }
        }
    
        $(chatText).append(
            
            `<p class="chatLines">${ UserBadgeDisplay }<text id="userName" style="color:${ UserColor }">${ User }</text><text id="chatBody">: ${ Message } </text></p>`
            // chat time (not used): <text id="timeText">${ Time } </text>
        
        );
    
        $('#chatText').scrollTop($('#chatText')[0].scrollHeight)
    
    }
    
    /* determine if chat should be printed */
    function ChatController (VideoStartTime) {

        var ElapsedTime = (Date.now() - VideoStartTime) / 1000
        
        for (i = 0; i < ChatTimes.length; i++) {
    
            if (VideoPlaying && ChatPlaybackStatus[i] == false && ChatTimes[i] <= ElapsedTime && ChatTimes[i] <= VideoDuration) {
                PrintChat(i)
                ChatPlaybackStatus[i] = true
            }
    
        }
        
    }
    
    /* make video available */
    function EnableVideo (Video) {
        console.log('Video loaded!')

        $(load).css('display', 'none')
        $(chatBar).toggle(ShowChat)
        $("#StartVideo").css('display', 'block')
        $("#StartVideo").prop('disabled', false)
        $(maintask).css('display', 'flex')
    }

    /* main functions */
    $(document).ready(function(){

        // determine which chats to present

        tracker = 1

        for (i = 0; i < ChatPlaybackStatus.length; i++) {

            if (ChatRate == 0) // present no chats
                ChatPlaybackStatus[i] = true
            else if (tracker == 1)
                ChatPlaybackStatus[i] = false
            else if (tracker <= ChatRate)
                ChatPlaybackStatus[i] = true
            
            tracker++
            if (tracker > ChatRate)
                tracker = 1

            //console.log(tracker)
        }

        //console.log(ChatPlaybackStatus)
        ChatsToPrint = ChatPlaybackStatus.reduce((out, bool, index) => !bool ? out.concat(index) : out, [])
        console.log(ChatsToPrint)

        //console.log(ChatPlaybackStatus)
        console.log('Chat Rate (Prop): ' + parseFloat(((ChatPlaybackStatus.length - ChatPlaybackStatus.filter(x => x).length)/ChatPlaybackStatus.length)).toFixed(3))

        if (urlParams.has('ChatRefresh'))
            ChatRefresh = urlParams.get('ChatRefresh')
        else
            ChatRefresh = 100

        console.log('Chat Refresh: ' + parseFloat(1000/ChatRefresh).toFixed(3) + '/s')
    
        //https://stackoverflow.com/questions/38057379/how-to-wait-for-iframe-content-to-load-using-only-javascript

        //TaskVideo.play()

        function update_progress (e) {
            if (e.lengthComputable) {
                var elem = document.getElementById("progressTicks");
                PercentLoaded = Math.round((e.loaded/e.total) * 100)
                elem.style.width = PercentLoaded + "%";
            }
        }

        var req = new XMLHttpRequest()
        req.open('GET', 'assets/clips/' + VideoID + '.mp4', true)
        req.onprogress = update_progress;
	
        req.responseType = 'blob'

        req.onload = function() {
            if (this.status === 200) {
               var videoBlob = this.response
               var video = URL.createObjectURL(videoBlob)
               TaskVideo.src = video
               TaskVideo.load()
            }
        }

        req.onerror = function() {}
        req.send()

        VideoPlaying = false

        /* determine if video is fully preloaded */
        TaskVideo.addEventListener('canplaythrough', function () { 
            VideoDuration = TaskVideo.duration
            console.log('Video Duration: ' + VideoDuration)
            EnableVideo("startVideo") 
        })

        videoStream.addEventListener("play", function () {
            VideoPlaying = true
            let VideoStartTime = Date.now()
    
            ChatUpdateInterval = setInterval(function () { ChatController(VideoStartTime) }, ChatRefresh)
    
            //console.log("DEBUG LOG: GREEN (Video Working)")
        })

    })

}