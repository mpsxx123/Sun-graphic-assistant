const socket = io(socketConnUrl, {
    transports: ['websocket'],
    upgrade: false,
    secure: true,
    cors: {
        origin: '*',
        credentials: true
    },
    rejectUnauthorized: false,
    reconnection: true,
    reconnectionAttempts: 400,
    reconnectionDelay: 3000,
    reconnectionDelayMax: 15000,
    timeout: 20000,
    pingTimeout: 60000,
    pingInterval: 25000
});

//console.log(socket);

//let currentRoom = roomId;  // 假设 roomId 是从服务器传递的
let online_users = []; // 用于存储用户名列表
let currentYuanbaoBalance = 0;

socket.emit('join', {room_id: currentRoomId});

// 发送时间校准请求
function requestTimeSync() {
    if (!currentUserSetting.is_logged) {
        return;
    }
    const clientTime = Date.now(); // 客户端当前时间
    console.log('requestTimeSync', clientTime);
    socket.emit("request_time_sync", {'client_time': clientTime});
  }

let serverClientTimeDiff = 0;
// 监听服务器的响应
socket.on("response_time_sync", (data) => {
    const { clientTime, serverTime } = data;
    const currentClientTime = Date.now();

    // 计算网络延迟和服务器时间差
    const latency = (currentClientTime - clientTime) / 2; // 假设网络延迟是对称的
    serverClientTimeDiff = serverTime - (clientTime + latency);

    console.log("服务器时间差:", serverClientTimeDiff, "毫秒");
    console.log("网络延迟:", latency, "毫秒");

    // 校准客户端时间
    const calibratedTime = Date.now() + serverClientTimeDiff;
    //console.log("校准后的客户端时间:", calibratedTime);
});



// 用于存储在线用户uid和username
let onlineUserInfobyUid = {}; // KEY: uid, VALUE: username
let onlineUidbyName = {}; // KEY: username, VALUE: uid

// 更新用户列表
socket.on('update_room_members', (data) => {
    online_users.length = 0; // 清空现有用户列表
    $('#users').empty();

    user_count = data.count;
    online_user_count = data.online_count;
    $('#room-user-count').html(`(${online_user_count}/${user_count})`);
    
    //console.log('update_room_members', data);
    //console.log(data);
    //window.userDick = window.userDick || {};
    // 添加其他用户
    data.users.forEach(user => {
        const username = user.username;
        const usertype = user.type;
        const uid = user.uid;
        const signature = user.signature.substring(0, 10);
        onlineUserInfobyUid[uid] = user;
        onlineUidbyName[username] = uid;
        
        if (usertype !== 'ai') {
            online_users.push(username);
            const active_level = Math.floor(user.active_minutes / 10) + 1;
            
            user_role = user.roomrole || 0;
            $('#users').append(`
                <li class="list-group-item" id="user-${uid}" data-username="${username}" data-uid="${uid}" data-user="${encodeURIComponent(JSON.stringify(user))}">
                    <div class="avator-img">
                        <img src="/statics/avatars/${user.avatar}" class="rounded-circle me-2 online-user-avatar" width="30" data-username="${username}" data-uid="${uid}">
                    </div>
                    <span class="user-name" style="cursor: pointer; color: ${user.color}; " data-username="${username}" data-uid="${uid}" data-usertype="${user.type}">${username}</span>   
                    ${getUserRoleTitle(user_role, active_level, usertype)}
                    <span class="typing-indicator" id="typing-${uid}" style="display:none;">#</span>
                    <span class="signature">${signature}</span>
                </li>
            `);
        }
    });
});


function getUserRoleTitle(user_role, activel_level, usertype) {
    //4：见习生，5：室友，8: 室长秘书，9: 副室长，10：室长
    if (user_role == 99) {
        return '<span class="user-level-official">官方</span>';
    }    
    else if (user_role == 4) {
        return '<span class="user-level-friend">见习生</span>';
    }
    else if (user_role == 5) {
        return '<span class="user-level-friend">室友</span>';
    }
    else if (user_role == 6) {
        return '<span class="user-level-friend">棋友</span>';
    }
    
    else if (user_role == 8) {
        return '<span class="user-level-roommaster_pre">室长秘书</span>';
    }
    else if (user_role == 9) {
        return '<span class="user-level-roommaster_pre">副室长</span>';
    }
    else if (user_role == 10) {
        return '<span class="user-level-roommaster">室长</span>';
    }
    else if (user_role == 20) {
        return '<span class="user-level-chess-king">棋王</span>';
    }
    else if (user_role == 50) {
        return '<span class="user-level-roommaster">元老</span>';
    }
    else {
        if (activel_level > 0) {
            return `<span class="user-active-level">LV.${activel_level}</span>`;
        }
        else if (usertype == 'ai') {
            return '<span class="user-type-ai">AI</span>';
        }
        else {
            return '';
        }
    }
}


function likeMessage(message_id, url, message_content) {
    

    //console.log('likeMessage', message_id);
    //增加number
    let old_number_html = $('#i-like-tag .number').html();
    let old_number = 0;
    if (old_number_html != ' ') {
        old_number = parseInt(old_number_html);
    }
    $('#i-like-tag .number').html(old_number + 1);
    $('#i-like-tag .number').addClass('has_number');

    socket.emit('like_message', {
        message_id: message_id, 
        room: currentRoomId, 
        url: url,
        message_content: message_content});    
}

function deleteLikeMessage(message_id) {
    // 移出这个message id
    $('.i-like-message').each(function() {
        if ($(this).data('message-id') == message_id) {
            $(this).remove();
        }
    });
    
    // 移出这个message id
    console.log('deleteILikeMessage', message_id);
    socket.emit('delete_like_message', {
        message_id: message_id, 
        uid: currentUid,
        room: currentRoomId});    
}

function showILikeMessages() {
    console.log('showILikeMessages');
    const chatTopicBar = $('#chat-topic-bar');
    chatTopicBar.show();
    chatTopicBar.empty();
    chatTopicBar.append('<div class="topic-title"><b>我喜欢的消息</b> <span class="btn btn-close" onclick="closeTopicBar()"></span></div><div class="topic-content">...</div>');
    let atMeMessagesHtml = '';
    $('.topic-content').empty();    

    fetch('/get_user_like_messages?uid=' + encodeURIComponent(currentUid))
        .then(response => response.json())
        .then(data => {
            console.log('getLikeMessages', data);
            if (data.status == 'error') {
                displaySystemMessage(data.message);
                return;
            }
            messages = data.messages;

            for (let i = messages.length - 1; i >= 0; i--) {
                message = messages[i];
                let message_content = message.content;
                let message_url = message.url;
                let message_id = message.id;     
                if (message_url && message_url.startsWith('https://img.alicdn')) {
                    atMeMessagesHtml += `<div class="message i-like-message" data-message-id="${message_id}">`
                    atMeMessagesHtml += `<div class="message-body"><span class="message-content"><div class="message-image"><img src="${message_url}" alt="收藏图片" class="chat-image" loading="lazy"></div></span><img class="send-message-id" data-message-url="${message_url}" src="/statics/icons/icon_send@4x.png" alt="发送" width="16" height="16" > <img delete-message-id="${message_id}" class="delete-message-id" src="/statics/icons/icon_close@4x.png" alt="删除" width="16" height="16" onclick="deleteLikeMessage('${message_id}')"></div>`
                    atMeMessagesHtml += `</div>`;
                }
                else {
                    if (message_content =='') {
                        message_content = '收藏链接';
                    }
                    else
                    {
                        message_content = message_content.substring(0, 18);
                    }
                    atMeMessagesHtml += `<div class="message" data-message-id="${message_id}">`
                    atMeMessagesHtml += `<div class="message-body"><span class="message-content"><a href="${message_url}" target="_blank">${message_content}</a></span><img delete-message-id="${message_id}" class="delete-message-id" src="/statics/icons/icon_close@4x.png" alt="删除" width="16" height="16" onclick="deleteLikeMessage('${message_id}')"></div>`
                    atMeMessagesHtml += `</div>`;
                }
            }

            $('.topic-content').append(atMeMessagesHtml);
        });
    

}

$(document).on('mouseenter', '.i-like-message', function() {
    console.log('i-like-message hover');
    $(this).find('.delete-message-id').show();
    $(this).find('.send-message-id').show();
});

$(document).on('mouseleave', '.i-like-message', function() {
    console.log('i-like-message hover out');
    $(this).find('.delete-message-id').hide();
    $(this).find('.send-message-id').hide();
});

$(document).on('click', '.send-message-id', function() {
    console.log('send-message-id clicked');
    const message_url = $(this).attr('data-message-url');
    sendImageMessage(message_url,"");
});

$('#i-like-tag').click(function() {    
    showILikeMessages();
    $('#i-like-tag .number').removeClass('has_number');
    $('#i-like-tag .number').html(' ');
});

socket.on('update_message_like', (data) => {
    //console.log('update_message_like', data);
    const message_id = data.message_id;
    const like_count = data.count;
    const message_element = $(`#${message_id}`);    
    if (message_element.length) {
        message_element.find('.message-like-count').html(like_count);
        message_element.find('.message-like-count').attr('data-like-count', like_count);
    }
});

// 处理聊天历史

function loadChatHistory(messages, likes) {
    
    const startTime = performance.now();
    messages.forEach(data => {
        if (likes && likes[data.message_id]) {
            data.likes = likes[data.message_id];
        }
        appendMessage(data);        
    });
    const endTime = performance.now();
    console.log(`聊天历史加载耗时: ${(endTime - startTime).toFixed(2)}ms`);

    if (currentRoomSetting.zero_chat && messages.length) {
        const message = messages[0].message;
        $('.chat-title h1').text(message);
    }
}

socket.on('chat_history', (data) => {
    
    console.log('Received chat history');

    $('#messages').empty(); // 清空现有消息

    messages = data.messages;
    likes = data.likes;    
    if(messages.length > 0) {
        toggleZeroChat('show');
        loadChatHistory(messages,likes);
    }
    else {
        if (currentRoomSetting.personal_chat) {
            $('#messages').append('<div class="no-message" style="display: flex; justify-content: center; align-items: center; height: 84%;"><img src="/statics/logo/tao_logo.png" width="300" height="300" alt="淘0" style="opacity: 0.05;"></div>');
            $('#messages').append('<div class="no-message-text" style="text-align: center; font-size: 13px; color:rgb(238 185 155); margin-top: 50px;">已经支持DeepSeek R1满血版AI对话<br>快在下方输入框输入问题试试吧！(对话内容仅自己可见)</div>');
            
        }
    }
    
    
    // 滚动到最新消息
    setTimeout(() => {
        $('#messages').scrollTop($('#messages')[0].scrollHeight);
    }, 100);
});

socket.on('update_roomlist', (data) => {
    console.log('update_roomlist');
    updateRoomsList()
});


function updateAtMeNumber(number) {
    if (number == 0) {
        $('#at-me-number').html(' ');
        $('#at-me-number').removeClass('has_number');
        return;
    }
    
    let old_number_html = $('#at-me-number').html();
    let old_number = 0;
    if (old_number_html != ' ') {
        old_number = parseInt(old_number_html);
    }
    if (old_number != number) {
        $('#at-me-number').html(number);
        $('#at-me-number').addClass('has_number');
    }
}   

let kboxMessageCreated = false;
let atMeMessages = [];

socket.on('chat', (data) => {
    toggleZeroChat('show');
    if (data.user.type == 'ai') {
        updateKBoxMessage(data);
        return;
    }
    appendMessage(data);

        
    //更新右侧话题栏
    const topic_tag = data.message.substring(data.message.indexOf('#'), data.message.indexOf(' '));
    if (data.message.startsWith('#') && topic_tag) {
        if ($('#chat-topic-bar').is(':visible')) {   // 如果右侧话题栏存在，则更新话题栏
            showTopicContent(topic_tag);
        }
    }

    // 检查@提醒
    if (data.message.includes(`@${currentUsername} `)) {
        updateAtMeNumber(1);
    }
        
    // 检查并触发特效
    if (currentRoomSetting.allow_effects) {
        if (typeof ChatEffects !== 'undefined' && typeof data.user.days !== 'undefined') {        
            ChatEffects.checkAndPlay(data.user.days, data.message);
        }
    }
});

function showAtMeMessages() {
    console.log('showAtMeMessages');
    const chatTopicBar = $('#chat-topic-bar');
    chatTopicBar.show();
    chatTopicBar.empty();
    chatTopicBar.append('<div class="topic-title"><b>@我消息</b><span class="topic-desc" style="font-size: 12px; color: #999;">（已支持跨房间）</span> <span class="btn btn-close" onclick="closeTopicBar()"></span></div><div class="topic-content"></div>');
    let atMeMessagesHtml = '';
    $('.topic-content').empty();
    atMeMessages = [];

    // 清空@我消息计数(小红点)
    updateAtMeNumber(0);

    fetch('/get_user_at_messages?uid=' + encodeURIComponent(currentUid))
        .then(response => response.json())
        .then(data => {
            console.log('getAtMeMessages', data);
            if (data.status == 'error') {
                displaySystemMessage(data.message);
                return;
            }
            atMeMessages = data.messages;
            for (let i = atMeMessages.length - 1; i >= 0; i--) {
                let message_content = atMeMessages[i].message;
                message_content = message_content.replace(`@${currentUsername} `, '');
                message_content = message_content.replace(/\[.*?\]/g, '');
                atMeMessagesHtml += `<div class="message"><div class="message-header"><span class="message-username">${atMeMessages[i].user.username}</span><span class="message-room"><a href="/chat/${atMeMessages[i].room}">#${atMeMessages[i].room_name}</a></span><span class="timestamp">${new Date(atMeMessages[i].timestamp).toLocaleTimeString()}</span></div>`;
                atMeMessagesHtml += `<div class="message-body"><span class="message-content">${message_content}</span></div></div>`;
            }
            $('.topic-content').append(atMeMessagesHtml);
        });
    
}

$('#at-me-tag').click(function() {
    
    console.log('at-me-tag clicked');
    updateAtMeNumber(0);

    showAtMeMessages();
});

socket.on('update_kbox_message', (data) => {
    updateKBoxMessage(data);
    if (!data.is_typing) {
        kboxMessageCreated = false;
    }
});

socket.on('update_news', (data) => {
    console.log('update_news', data);
    if (data.news_list) {
        // 发送新闻卡片
        let news_content = '';
        for (let i = 0; i < data.news_list.length; i++) {
            let news = data.news_list[i];
            news_content += `<div class="news_card_item"><a href="${news.url}" target="_blank">${news.title} &gt;&gt;</a></div>`;
        }
        $('#messages').append(`<div class="news_card">${news_content}</div>`);
        setTimeout(() => {
            $('#messages').scrollTop($('#messages')[0].scrollHeight);
        }, 100);
        
    }
});


function renderMarkdown(text) {
    return marked.parse(text, {
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        renderer: new marked.Renderer(),
        gfm: true,
        tables: true,
        breaks: false,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: false,
        xhtml: false
    });
}

// 使用 try-catch 包装关键函数
function safeAppendMessage(data) {
    try {
        appendMessage(data);
    } catch (error) {
        console.error('Error adding message:', error);
    }
}           


function appendMessage(data) {
    // 使用文档片段减少DOM重排
    const fragment = document.createDocumentFragment();
    const messageId = data.message_id || `message-${Date.now()}`;
    
    // 检查消息是否已经存在
    if ($(`#${messageId}`).length) {
        return;
    }    
    // 如果超过300条，则删除最早的消息，减少长时间不刷新浏览器对于客户端内存的占用
    if ($('#messages').children().length > 300) { 
        $('#messages').children().first().remove();
    }

    let image_url = '';
    if (data.image) {
        image_url = data.image.startsWith('http') ? data.image : `/uploads/${data.image}`;
    }

    let user_role = data.user.roomrole;
    let message_content = data.message;
    lastSystemMessage = data.message;

    // 检查@提醒,保存@我的消息
    if (message_content.includes(`@${currentUsername} `)) {
        // 保留最近50条@我消息
        atMeMessages.push(data);
        if (atMeMessages.length > 50) {
            atMeMessages.shift();
        }
    }

    // 预处理消息内容，减少重复计算
    const processedContent = processMessageContent(message_content, image_url);
    message_content = processedContent.message;
    const {
        recommend_button_content,
        quote_content,
        quote_content_html,
        topic_tag,
        topic_tag_html
    } = processedContent;
    

      //支持url转换成链接，如果识别的URL链接中仅包含个链接，并且包含.taobao.com或.tmall.com
      var urlRegex = /(https?:\/\/\S+)/g;
      var isUrl = false;
      if (urlRegex.test(message_content) && message_content.match(urlRegex).length === 1 && (message_content.includes('.taobao.com') || message_content.includes('.tmall.com'))) {
          isUrl = true;
      }
      
      
      let user_days_grade = 0;
      try {
          const days = data.user.days || 0;
          if (days >= 365) user_days_grade = 9;
          else if (days >= 200) user_days_grade = 8;
          else if (days >= 120) user_days_grade = 7;
          else if (days >= 60) user_days_grade = 6;
          else if (days >= 45) user_days_grade = 5;
          else if (days >= 30) user_days_grade = 4;
          else if (days >= 14) user_days_grade = 3;
          else if (days >= 7) user_days_grade = 2;
          else if (days >= 2) user_days_grade = 1;
      } catch (e) {
          console.error('获取等级失败:', e);
      }

    const like_count = data.likes ? data.likes : 0;

    let like_message_content = "";
    let like_url = "";
    if (image_url) {
        like_url = image_url;
        like_message_content = message_content;
    }  
    let user_signature = "";        
    if (onlineUserInfobyUid[data.user.uid]) {
        user_signature = onlineUserInfobyUid[data.user.uid].signature || "";
    }
    // 创建消息元素
    avatar_url = `/statics/avatars/${data.user.avatar}`;
    if (data.user.type == 'ai') {
        avatar_url = `/statics/bots/${data.user.avatar}`;
    }
    const isMyMessage = data.user.uid == currentUid;
    const messageElement = $(`        
        <div id="${messageId}" class="message ${isMyMessage ? 'right' : ''}" data-username="${data.user.username}" data-uid="${data.user.uid}" data-user="${encodeURIComponent(JSON.stringify(data.user))}" data-my-message="${isMyMessage}">
            <div class="message-avatar avator-img">
                <img src="${avatar_url}" alt="Avatar" class="rounded-circle" width="36" loading="lazy">
            </div>
            <div class="message-content">
                ${isMyMessage ? '' : `
                <div class="message-content-top">
                    <span class="message-username" style="cursor: pointer; color: null; font-weight: bold;"><strong style="color: ${data.color}">${data.user.username}</strong></span>
                    ${getUserRoleTitle(user_role, 0, data.user.type)}
                    <span class="signature">${user_signature}</span>
                    <small class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</small>
                </div>
                `}
                ${message_content ? 
                    `<div class="message-text-content ${!isUrl && !currentRoomSetting.zero_chat ? `level${user_days_grade}` : ''}">
                        <div class="left"></div>                        
                        <span class="message-text ${isUrl ? 'isUrl' : ''}"></span>
                        <div class="right"></div>
                    </div>` : ''}
                ${image_url ? `<div class="chat-image-container">
                    <img src="${image_url}" class="chat-image" loading="lazy">
                    ${!currentRoomSetting.zero_chat ? `<div class="message-like-count" data-message-id="${messageId}" data-like-count="${like_count}" onclick="likeMessage('${messageId}','${like_url}','${like_message_content}')">${like_count?like_count:'0'}</div>` : ''}
                    ${isRoomAdmin && !currentRoomSetting.zero_chat ? `<span class="img-add-to-window" onclick="addToWindow('','${image_url}')">+</span>` : ''}
                </div>` : ''}
                
            </div>
        </div>
    `);

    // 检查@提醒
    if (data.message.includes(`@${currentUsername} `)) {
        messageElement.addClass('mentioned');
    }
    checkIsBottom();

    // 添加到文档片段
    fragment.appendChild(messageElement[0]);

    // 处理消息内容渲染
    let renderedMessage = message_content;
    if (message_content && message_content.split('\n').length > 1) {
        renderedMessage = renderMarkdown(message_content);
    }

    // URL 处理
    if (isUrl) {
        const messageUrlId = `${messageId}_url`;
        const jumpUrl = renderedMessage.match(urlRegex)[0];
        renderedMessage = renderedMessage.replace(urlRegex, `<a id="${messageUrlId}" href="$1" target="_blank">$1</a>`);
        // 延迟加载链接卡片
        setTimeout(() => updateLinkCard(messageUrlId, jumpUrl), 0);
    }

    if (topic_tag_html) {
        renderedMessage = topic_tag_html + renderedMessage;
    }

    if (recommend_button_content) {
        renderedMessage += `<button class="btn btn-recommend" onclick="sendDirectMessage('${recommend_button_content}')">${recommend_button_content}</button>`;
    }

    // 一次性设置消息内容
    const messageTextElement = messageElement.find('.message-text');
    messageTextElement.html(renderedMessage);


    // 将内容的a 标签增加 _blank 属性
    messageElement.find('.message-text a').attr('target', '_blank');

    // 处理消息样式
    if (renderedMessage.split('<br>').length === 1 && !renderedMessage.includes('<p>') && !data.image) {
        messageElement.addClass('message-single-line');
    }

    if (quote_content_html) {
        messageElement.find('.message-content').append(quote_content_html);
    }

    if (data.user.type === 'ai') {
        messageElement.addClass('kbox-message');
    }

    if (currentRoomSetting.zero_chat && !isMyMessage) {
        const interactive_container = $(`<div class="interactive-container">
            <div class="inter-item inter-copy" onclick="copyMessage('${messageId}')"></div>
            <div class="inter-item inter-reset" onclick="resetMessage('${messageId}')"></div>
            
        </div>`)
        $(fragment).find('.message-content').append(interactive_container);
    }
    // 一次性添加到DOM
    $('#messages').append(fragment);

    
    lastSystemMessage = 'TEXT';
    handleScroll();
    playMessageSound();
    startTitleFlash();
}

function copyToClipboard(text) {
    // 创建一个临时的 textarea 元素
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
  
    // 选中文本
    textarea.select();
    textarea.setSelectionRange(0, 99999); // 兼容移动设备
  
    // 执行拷贝命令
    try {
      document.execCommand("copy");
      console.log("文本已成功拷贝到剪贴板！");
    } catch (err) {
      console.error("拷贝失败: ", err);
    }
  
    // 移除临时的 textarea 元素
    document.body.removeChild(textarea);
  }

function copyMessage(messageId) {
    console.log('inter-copy');
    const message = $(`#${messageId}`).find('.message-text').text();    
    copyToClipboard(message);
}

function resetMessage(messageId) {
    // 读取该条消息的上一条消息
    const lastMessage = $(`#${messageId}`).prev().find('.message-text').text();
    sendDirectMessage(lastMessage);
}

// 辅助函数：处理消息内容
function processMessageContent(content, image_url) {
    let message = content;
    let recommend_button_content = '';
    let quote_content = '';
    let quote_content_html = '';
    let topic_tag = '';
    let topic_tag_html = '';

    // 处理推荐按钮内容
    if (message.includes('[[') && message.includes(']]')) {
        recommend_button_content = message.substring(message.indexOf('[[') + 2, message.indexOf(']]'));
        message = message.substring(0, message.indexOf('[['));
    }

    // 处理引用内容
    if (message.includes('[') && message.includes(']') && !message.includes('[[')) {
        quote_content = message.substring(message.indexOf('[') + 1, message.indexOf(']'));
        message = message.substring(0, message.indexOf('[')) + message.substring(message.indexOf(']') + 1);
        quote_content_html = `<span class="message-quote">&gt;&gt;${quote_content}</span>`;
    }

    // 提取话题标签"#TOPIC TEXT"
    if (message.match(/#[^#\s]+?\s/)) {
        if(image_url != '')
            message += ' ';
        topic_tag = message.substring(message.indexOf('#'), message.indexOf(' '));
        message = message.substring(message.indexOf(' ') + 1);
        topic_tag_html = `<span class="topic-tag" style="color: ${topic_tag.includes('反方') ? 'blue' : ''}">${topic_tag}</span> `;
    }

    

    return {
        message,
        recommend_button_content,
        quote_content,
        quote_content_html,
        topic_tag,
        topic_tag_html
    };
}

function renderItemCard(messsage_id, message_content) {
    try {
        data = JSON.parse(message_content);    
        //console.log('data in renderItemCard', data);    
        if (!data) {
            return '';
        }
        item_pic = data.item_pic;
        item_title = data.item_title;
        item_url = data.item_url;
        item_clickurl = data.click_url;
        item_ori_price = data.item_price;
        
        item_rebate = data.rebate_amount;
        item_id = data.item_id;

        if (currentRoomSetting.convert_ad_link) {   //如果需要转换广告链接，则不使用item_clickurl
            item_clickurl = '';
        }

        basic_item_url = `https://item.taobao.com/item.htm?id=${item_id}`;

        if (item_clickurl!="") {  //福利商品
            item_price = data.promotion_price;        
            message_content = `<div class="coupon-helper-message">
                <div class="rebate_alink" data-spm="rebate">
                    <img class="rebate-pic" src="${item_pic}" id="img_844181445091"> 
                    <div class="rebate-info">
                        <p class="title ellipsis">${item_title}</p>
                        <p class="prize">爆料价<span class="icon">¥</span><span class="count">${item_price}</span><span class="old">优惠前</span><span class="old-count">¥${item_ori_price}</span></p>                        
                        ${item_rebate ? `<div class="coupe">
                            <img src="https://img.alicdn.com/imgextra/i4/O1CN01FKSDpd1vGvEd33qoi_!!6000000006146-2-tps-32-32.png">该商品确认收货后预估返${item_rebate}元红包
                        </div>` : `<div class="coupe">
                            <img src="https://img.alicdn.com/imgextra/i4/O1CN01FKSDpd1vGvEd33qoi_!!6000000006146-2-tps-32-32.png">点击获取优惠
                        </div>`}
                        <div class="message-like-count" data-message-id="${messsage_id}" onclick="likeMessage('${messsage_id}', '${basic_item_url}', '${item_title}')" data-like-count="0">0</div>
                        <div class="btn-group">
                            ${currentRoomSetting.auto_chat ? `<div class="send-to-ai" onclick="sendItemToAI('${item_title}', '${item_price}')">AI分析</div>` : ''}
                            <div class="btn-item-buy" onclick="window.open('${item_clickurl}', '_blank')">立即查看</div>                     
                        </div>  
                    </div>
                </div>
            </div>`;
        }
        else if (item_id != null) {
            item_price = data.item_price;
            message_content = `<div class="coupon-helper-message">
                <div class="rebate_alink" data-spm="rebate">
                    <img class="rebate-pic" src="${item_pic}" id="img_844181445091"> 
                    <div class="rebate-info">
                        <p class="title ellipsis">${item_title}</p>
                        <p class="prize">优惠价格<span class="icon">¥</span><span class="count">${item_price}</span></p>
                        <div class="coupe">
                            
                        </div>
                        <div class="message-like-count" data-message-id="${messsage_id}" onclick="likeMessage('${messsage_id}', '${basic_item_url}', '${item_title}')" data-like-count="0">0</div>
                        <div class="btn-group"> 
                            ${currentRoomSetting.auto_chat ? `<div class="send-to-ai" onclick="sendItemToAI('${item_title}', '${item_price}')">AI分析</div>` : ''}
                            <div class="btn-item-buy" onclick="window.open('${basic_item_url}', '_blank')">立即查看</div>
                            </div>
                            
                        </div>  
                    </div>
                </div>
            </div>`;
        }
        else {
            
            message_content = '商品链接不支持';
        }

    } catch (e) {
        console.error('renderItemCard error', e);
        return '';
    }
    return message_content;
}

function renderOtherUrlCard(messsage_id, url, data) {
    const domain = getDomainFromUrl(url);
    return `<a class="jump-card" href="${url}" target="_blank">
        <div class="jump-card-content">
            <div class="left-content">
                <div class="title">${data.title}</div>
                ${data.description ? `<div class="desc">${data.description}</div>` : ''}
            </div>
            <img class="right-image" src="${data.first_png_image ? data.first_png_image : '//gw.alicdn.com/imgextra/i1/O1CN01ONhILo1KhMJtEaNgp_!!6000000001195-0-tps-72-72.jpg'}" />
        </div>
        <div class="domain">
            ${domain}
        </div>
    </a>`;
}

function setTopicTag(tag) {
    let tag_content = tag;
    let input_content = $('#chat-input').val();
    if (input_content.includes(tag_content)) {
        return;
    }
    input_content = input_content.substring(input_content.indexOf(' ') + 1);
    $('#chat-input').val(tag_content + ' ' + input_content);
    $('#chat-input').focus();
}

function updateLinkCard(id, url) {
    fetch(`/get_url_metainfo?url=${encodeURIComponent(url)}`)
    .then(response => response.json())
    .then(data => {
        if (data.status == 'success') {
            try {
                // 如果是商品链接，则直接返回商品卡片
                //console.log('data', data);
                link_type = data.type;
                if (link_type == 'item_url') {
                    message_content = renderItemCard(id, data.data);
                    
                }
                else if (link_type == 'other_url') {
                    message_content = renderOtherUrlCard(id, url, data.data);
                }
                else {
                    message_content = data.message;
                }                            
                const a = document.getElementById(id);
                $(a).parent().html(message_content);                
            } catch (e) {
                console.error('更新链接卡片失败', e);
            }
        }
        else {
            console.log('更新链接卡片失败:', data.message);
        }
    })
    .catch(error => {
        console.error('请求失败:', error);
    });
}


function sendItemToAI(item_title, item_price) {
    ai_input = 'AI商品分析：商品标题【' + item_title + '】，价格【' + item_price + '】';
    sendDirectMessage(ai_input);
}

// 定义一个函数用于获取域名
function getDomainFromUrl(url) {
    const domainRegex = /^(https?:\/\/)?([^\/]+)/i;
    const match = url.match(domainRegex);
    if (match && match[2]) {
        return match[2];
    }
    return null;
}

// 显示系统消息, 只保留最近的一条系统消息
var lastSystemMessage = '';
function displaySystemMessage(message) {
    if (message === lastSystemMessage) {
        return;
    }
    lastSystemMessage = message;
    if ($('#system-message-1').length) {
        $('#system-message-1').remove();
    }

    $('#messages').append(`<div class="system-message" id="system-message-1">${message}</div>`);    
    
    //$('#messages').scrollIntoView({ behavior: 'smooth' });
    handleScroll()
}

function getWelcomeText() {    
    let welcome_message_list = ['你好', '你好啊', '大家好', '大家好啊'];
    //判断时间早上、中午、晚上
    const hour = new Date().getHours();    
    if (hour <7 ) {
        welcome_message_list.push('凌晨好');

    }
    else if (hour>7 && hour < 10) {
        welcome_message_list.push('早上好');
    }      
    else if (hour >= 12 && hour < 14) {
        welcome_message_list.push('中午好');
    }
    else  if (hour >= 14 && hour < 18) {
        welcome_message_list.push('下午好');
    }
    else  if (hour >= 18 && hour < 24) {
    welcome_message_list.push('晚上好');
    }  
    return welcome_message_list[Math.floor(Math.random() * welcome_message_list.length)];
}

// on click welcome-new-user

function welcomeNewUser(username, welcome_type) {   
    //const username = $(this).attr('data-username');    
    //$('#chat-input').val(`@${username} 你好，欢迎加入`);
    let welcome_message = '';
    
    if (welcome_type == 1) {  // 群里的人欢迎新用户
        let emoji_smile_list = ['😊','😍', '🥰', '😘', '😀', '😃', '😄','😋', '😛', '😝', '😜', '🤪', '' ]
        emoji_smile = emoji_smile_list[Math.floor(Math.random() * emoji_smile_list.length)];
        const welcome_message_list = ['欢迎新朋友', '欢迎', '热烈欢迎'];
        welcome_message = emoji_smile + welcome_message_list[Math.floor(Math.random() * welcome_message_list.length)];
        welcome_message = `@${username} ${welcome_message}`;
    }
    else if (welcome_type == 2) {  // 群里的人向新用户打招呼
        
        welcome_message = getWelcomeText();
        welcome_message = `@${username} ${welcome_message}`;
    }
    else if (welcome_type == 3) {  // 新人向群里的人打招呼
        let welcome_message_list = ['大家好', '大家好啊', '大家好，请多关照', '大家好，新人报道'];
        welcome_message = welcome_message_list[Math.floor(Math.random() * welcome_message_list.length)];
    }
    sendDirectMessage(welcome_message);
    // $('#chat-input').val(`${welcome_message}`);
    // $('#chat-input').focus();

    handleScroll()
}

function sendYuanbao(username,amount=1) {
    // 发送1个元宝
    const req_amount = amount;
    const uid = onlineUidbyName[username];
    if(!uid) {
        console.log('用户不存在', username);
        displaySystemMessage(`元宝发送不成功，用户不存在: ${username}`);
        return;
    }
    socket.emit('yuanbao_clip_transfer', {
        room: currentRoomId,
        username: currentUsername,
        to_user: username,
        to_uid: uid,
        req_amount: req_amount
    });
    
}

function sayHello(username) {
    $('#chat-input').val(`#新人报道 大家好，我是${username}`);
    $('#chat-input').focus();
}

function displayWelcomeMessage(username, new_user) {
    let message = '';

    if (new_user) {
        message = '新朋友 '+username+' 加入了聊天室，';
    }
    else {
        message = username+' 进入了聊天室';
    }
    
    if (message === lastSystemMessage) {
        return;
    }
    lastSystemMessage = message;   
    if ($('#system-message-2').length) {
        $('#system-message-2').remove();
    }

    if (currentUsername === username) {  // 对于自己，跟群里的人打招呼
        message = '你进入了聊天室';        
        message_html = `<div class="system-message" id="system-message-2">${message} `
        if (new_user) {
            message_html += `，<span class="welcome-new-user" onclick="sayHello('${username}')">做个新人报道</span>`
        }
        message_html += `，<span class="welcome-new-user" onclick="welcomeNewUser('${username}',3)">和大家打个招呼</span> `        
        message_html += `</div>`;
        $('#messages').append(message_html);
    } 
    else { // 群里的人跟 加入聊天室的用户打招呼
        if (new_user) {
            $('#messages').append(`<div class="system-message" id="system-message-2">${message} <span class="welcome-new-user" onclick="welcomeNewUser('${username}',1)">热烈欢迎</span>，<span class="welcome-new-user" onclick="sendYuanbao('${username}',1)">送1个元宝</span></div>`);    
        }
        else {
            $('#messages').append(`<div class="system-message" id="system-message-2">${message} <span class="welcome-new-user" onclick="welcomeNewUser('${username}',2)">和TA打个招呼</span></div>`);    
        }     
    }
        

    //$('#messages').scrollIntoView({ behavior: 'smooth' });
    handleScroll()
}


socket.on('update_message_recommend_questions', (data) => {
    console.log('update_message_recommend_questions', data);

    if (currentRoomSetting.zero_chat) {
        const message_id = data.message_id;
        const questions = data.questions;
        const message_element = $(`#${message_id}`);
        for (let i = 0; i < questions.length; i++) {
            message_element.find('.message-recommend-questions').append(`<div class="recommend-question" onclick="sendDirectMessage('${questions[i]}')">${questions[i]}</div>`);
        }
        handleScroll();     
    }

});


let kboxMessageId = null;
let currentLastMessageId = '';

function updateKBoxMessage(data) {
    currentLastMessageId = data.message_id;
    

    const messageId = data.message_id;
    
    if (!kboxMessageId) {
        kboxMessageId = messageId;
    }
    
    checkIsBottom();

    let message_content = data.message;
    
    if (kboxMessageId.startsWith('couponhelper')) {
        console.log('couponhelper bot not supported', kboxMessageId);
        
    }    

    if (message_content == '(...)') {
        message_content = '<img src="/statics/icons/loading1.gif" id="ai_loading_img" alt="loading" style="width: 20px; height: 20px;">';
    }

    let messageElement = $(`#${kboxMessageId}`);
    
    if (messageElement.length) {  // 后续的流式消息更新
        
        var message = message_content;
        
        messageElement.attr('data-my-message', 'false');
             
        // 渲染思考内容
        if (typeof data.reasoning !== 'undefined' && data.reasoning !== null && data.reasoning !== '') {
            messageElement.find('.message-text-thinking').html(renderMarkdown(data.reasoning)).show();
        } else {
            messageElement.find('.message-text-thinking').hide();
        }
        
        const msgtype = data.msgtype;
        if (msgtype == 'aiquery') {
            message += '<span class="kbox_message_ai">(仅自己可见)</span>';
        }
        
        if (message_content) {
            
            messageElement.find('.message-text').html(renderMarkdown(message_content));
            
            if (!data.is_typing) {

                // 将内容的所有a 标签增加 _blank 属性
                messageElement.find('.message-text a').attr('target', '_blank');

                const interactive_container = $(`<div class="interactive-container">
                <div class="inter-item inter-copy" onclick="copyMessage('${kboxMessageId}')"></div>
                <div class="inter-item inter-reset" onclick="resetMessage('${kboxMessageId}')"></div>
                
                </div>`)
                messageElement.find('.message-content').append(interactive_container);
            }
        }      
    } 
    else {   // 初始化第一条消息 (下面这段代码不生效)
        room_bot = data.user.username;
        bot_avatar = data.user.avatar;        
        messageElement = $(`
            <div id="${kboxMessageId}" class="message">
                <img src="/statics/bots/${bot_avatar}" alt="Avatar" class="rounded-circle me-2" width="30">
                <div class="message-content">
                    <strong>${room_bot}</strong><span class="user-type-ai">AI</span> <span class="message-text-thinking"></span> <span class="message-text" style="color: #ff5000;">${message_content} (AI生成)</span>
                    <small class="timestamp">${new Date().toLocaleTimeString()}</small>
                    <div class="message-recommend-questions"></div>
                </div>
            </div>
        `);
        $('#messages').append(messageElement);
        messageElement.find('.message-text').html(renderMarkdown(message_content));
    }
    
    if (!data.is_typing) {
        messageElement.removeClass('typing');
        kboxMessageId = null; // 重置 kboxMessageId，为下一次对话做准备
        window.isChatting = false;
        updateButtonStatus();
    }
    handleScroll();
}


// 文档协作功能
let isTypingChat = false;
const typingDelayChat = 1000; // 1秒
let typingTimerChat;

$('#chat-input').on('input', function() {
    clearTimeout(typingTimerChat);
    if (!isTypingChat) {
        socket.emit('start_typing', {username: currentUsername, uid: currentUid, room: currentRoomId});
        isTypingChat = true;
    }
    typingTimerChat = setTimeout(() => {
        socket.emit('stop_typing', {username: currentUsername, uid: currentUid, room: currentRoomId});
        isTypingChat = false;
    }, typingDelayChat);
});



// 处理用户正在输入（聊天）
socket.on('user_typing', (data) => {
    //console.log('收到 user_typing 事件:', data);
    $(`#typing-${data.uid}`).show();
});

// 处理用户止输入（聊天）
socket.on('user_stop_typing', (data) => {
    //console.log('收到 user_stop_typing 事件:', data);
    $(`#typing-${data.uid}`).hide();
});

socket.on('error', (error) => {
console.error('Socket error:', error);
});        

// 发送聊天消息
$('#btn_send').click(() => {
    // reset last message time for tracking    
    inputMessage();
    $('#user-suggestions').hide();
});


// 浏览器本地消息历史记录管理
const MESSAGE_HISTORY_KEY = 'chat_message_history';
const MAX_HISTORY_LENGTH = 10;
let messageHistory = JSON.parse(localStorage.getItem(MESSAGE_HISTORY_KEY) || '[]');
let historyIndex = -1;

// 添加消息到历史记录
function addToMessageHistory(message) {
    if (!message.trim()) return;
    
    // 避免重复消息
    if (messageHistory[0] !== message) {
        messageHistory.unshift(message);
        if (messageHistory.length > MAX_HISTORY_LENGTH) {
            messageHistory.pop();
        }
        
        localStorage.setItem(MESSAGE_HISTORY_KEY, JSON.stringify(messageHistory));
    }
    historyIndex = -1;
}

function checkMessageLength() {
    if ($('#chat-input').val().length > 0) {
        $('#btn_send').css('opacity', '1');
    }
    else {
        $('#btn_send').css('opacity', '0.2');
    }
}

// 监听回车发送消息
$('#chat-input').keypress((e) => {
    if (e.which === 13 && !e.shiftKey) {  // Enter key pressed without Shift        
        e.preventDefault(); // 防止换行
        inputMessage();
        $('#user-suggestions').hide();
    } 
    
});

// 监听回车发送消息
$('#chat-input').keydown((e) => {  
    
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();               
        if (messageHistory.length === 0) return;
        
        if (e.key === 'ArrowUp') {
            // 如果是第一次按上键，保存当前输入
            
            if (historyIndex === -1 && this.value && this.value.trim()) {
                messageHistory.unshift(this.value);
                if (messageHistory.length > MAX_HISTORY_LENGTH) {
                    messageHistory.pop();
                }
            }
            
            historyIndex = Math.min(historyIndex + 1, messageHistory.length - 1);
    } else {
            historyIndex = Math.max(historyIndex - 1, -1);
        }
        
        this.value = historyIndex === -1 ? '' : messageHistory[historyIndex];
        $('#chat-input').val(this.value);
        // 将光标移到末尾
        setTimeout(() => {
            this.selectionStart = this.selectionEnd = this.value.length;
        }, 0);
    }
    else if (e.key === 'Backspace') {

        if ($('#chat-input').val().length == 0) {
            $('#chat-image-preview').css('opacity', '0.5');
            $('#chat-image-preview').html('');
            $('#chat-image-preview-url').val('');
            $('#chat-input').val('');            
        }
    }
});

// 在文件顶部添加一全局变量


// 修改点击头像打设置模态窗口的逻辑
$('#user-avatar').click(() => {
    sendGoldlog('/pcbbs.chatroom.myavatar', 'chatroom.myavatar', {})
    var myModal = new bootstrap.Modal(document.getElementById('settingsModal'));
    myModal.show();
});

// 修改保存设置的逻辑
$('#saveSettings').click(function() {
    $.ajax({
        url: '/update_settings',
        type: 'POST',
        data: $('#settings-form').serialize(),
        success: function(response) {
            if (response.status === 'success') {
                alert('更新成功');
                var myModalEl = document.getElementById('settingsModal');
                var modal = bootstrap.Modal.getInstance(myModalEl);
                modal.hide();
                
                // 更新当前用户信息
                const newUsername = $('#nickname').val();
                const newColor = $('#color').val();
                
                // 更新当前用户名
                const oldUsername = currentUsername;
                currentUsername = newUsername;
                
                // 更新头像图片
                $('#user-avatar-img').attr('src', `/statics/avatars/${$('#avatar').val()}`);

                $('#user-avatar-text').text(newUsername);
                
                // 发送更新事件到服务器(暂时不通其他用户，只更新自己的信息)
                socket.emit('user_updated', {
                    old_username: oldUsername,
                    new_username: newUsername,
                    new_avatar: $('#avatar').val(),
                    new_color: newColor
                });
            } else {
                alert('更新失败: ' + response.message);
            }
        },
        error: function() {
            alert('更新失败，请稍后再试');
        }
    });
});

// 添加选择头像的逻辑
$('.avatar-option').click(function() {
    $('.avatar-option').removeClass('selected');
    $(this).addClass('selected');
    $('#avatar').val($(this).data('avatar'));
});

// 添加一个新的事件监听器来处理用户信息更新
socket.on('user_updated', (data) => {
    // 更新用户列表
    uid = data.uid;
    username = data.username;
    avatar = data.new_avatar;
    color = data.new_color;
    signature = data.new_signature;

    if (uid in onlineUserInfobyUid) {
        onlineUserInfobyUid[uid].username = username;
        onlineUserInfobyUid[uid].color = color;
        onlineUserInfobyUid[uid].signature = signature;
    }
    
    $(`#user-${uid} .user-name`).text(username);    
    $(`#user-${uid} .user-name`).css('color', color);
    $(`#user-${uid} .signature`).text(signature);
    
    // 在聊天区域添加一条系统消息
    if (data.username == currentUsername) {  // 自己更改了自己的信息
        sysmessage = `${data.username} 更改了用户信息`;
        displaySystemMessage(sysmessage);
    }
});

// 更新socket连接的ip (作废)
socket.on('update_socket_balance_ip', (data) => {    
    
    fetch(`/get_socket_balance_ip/${currentRoomId}`)
    .then(response => response.json())
    .then(data => {
        console.log('on update_socket_balance_ip', data);
        current_socket_ip_changed = false;
        if (socket_balance_ip !== data.ip) {    
            socket_balance_ip = data.ip;
            console.log('update_socket_balance_ip change to', socket_balance_ip);
            // 通知socket重新连接            
            current_socket_ip_changed = true;
            
            //改为每隔5秒检查一次，如果网络已经断开链接发生变化则刷新页面
            //console.log('服务器切换了，页面刷新');
            //window.location.reload();
                       
        }
    });
});

// 埋点
function sendGoldlog(logkey, spmcd, params, type, method) {
    type = type || 'CLK'
    params = params || {}
    method = method || 'GET'
    if (window.goldlog) {
        var spmab = window.goldlog.spm_ab || ['0', '0'];
        var spm = spmab.join('.') + '.' + spmcd;
        var paramsStr = [];
        // spm
        paramsStr.push('spm=' + spm)
        var keys = Object.keys(params);
        for (var i = 0; i < keys.length; i++) {
            paramsStr.push(encodeURIComponent(keys[i]) + '=' + encodeURIComponent(params[keys[i]]))
        }
        window.goldlog.record(logkey, type, paramsStr.join('&'), method)
    }
}

// 在文件开头添加重连相关变量
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
let isReconnecting = false;

function socketSendMessage() {
    const messageInput = $('#chat-input');
    const message = messageInput.val().trim();


    // 原有的发送消息逻辑
    const bot_username = currentRoomBot;
    let talk_with_ai = false;
    if (message.startsWith(`@${bot_username}`)) {
        talk_with_ai = true;
    }
    if (talk_with_ai) {
        const lastMessage = $('#messages .message').last();
        if (lastMessage.length && lastMessage.find('.is-typing').length) {
            alert('AI正在思考中，请稍后再试...');
            return;
        }
    }
    
    if (!checkMessageLimits(message)) {
        return;
    }

    // 激活摸鱼计时器
    lastMessageTime = Date.now();   
    isTracking = true;

    socket.emit('chat', {
        message,
        color: userColor,
        msgtype: 'text',
        room: currentRoomId,
        username: currentUsername,
        uid: currentUid
    });

    // 如果用户在上一句input输入框的前面圈了某个人,比如 @user 消息，则聊天输入框中保持@用户名和一个空格
    const lastMessage = messageInput.val().trim();
    if (lastMessage.startsWith('@')) {     
        targetUsername = lastMessage.substring(1, lastMessage.indexOf(' ')).trim();
        //messageInput.val("@"+targetUsername + ' ');
        messageInput.val('');
    }
    else {
        messageInput.val('');
    }   
}

// 发送直接消息
function sendDirectMessage(message) {

    // 检查消息限制
    if (!checkMessageLimits(message)) {
        return;
    }

    // 激活摸鱼计时器
    lastMessageTime = Date.now();   
    isTracking = true;

    if (message.length > 0) {
        socket.emit('chat', {
            message: message,
            color: userColor,
            msgtype: 'text',
            room: currentRoomId,
            username: currentUsername,
            uid: currentUid
        });
    }
}

function processRoomCommand(input) {
    
    if (input.startsWith('/help')) {
        if (isRoomAdmin) {
            alert('聊天室指令：\n/help 帮助\n/kick 踢人\n/broadcast 聊天室广播\n/poll 投票开关 /setpoll 初始化投票 /quiz 答题开关 /setquiz 初始化答题');
        }
        else {
            alert('聊天室指令：\n/help 帮助');
        }
        return;            
    }
    else if (input.startsWith('/kick') && isRoomAdmin) {            
        alert('暂时不支持');            
        return;            
    }
    else if (input.startsWith('/broadcast' ) && isRoomAdmin) {
        message = input.substring(10).trim();
        socket.emit('notifyall', {
            message: message,
            room: currentRoomId,
            username: currentUsername,
            uid: currentUid
        });
        
        return;            
    }
    else if (input.startsWith('/poll') && isRoomAdmin) {
        socket.emit('toggle_poll', {
            room: currentRoomId,
            username: currentUsername,
            uid: currentUid,
            poll_type: 'poll'
        });
        return;
    }
    else if (input.startsWith('/setpoll ') && isRoomAdmin) {
        const poll_options = input.substring(9).trim();
        socket.emit('init_poll', {
            room: currentRoomId,
            poll_options: poll_options,
            poll_type: 'poll'
        });
        return;
    }
    else if (input.startsWith('/quiz') && isRoomAdmin) {
        socket.emit('toggle_poll', {
            room: currentRoomId,
            username: currentUsername,
            uid: currentUid,
            poll_type: 'quiz'
        });
        return;
    }
    else if (input.startsWith('/setquiz ') && isRoomAdmin) {
        const quiz_options = input.substring(9).trim();
        socket.emit('init_poll', {
            room: currentRoomId,
            poll_options: quiz_options,
            poll_type: 'quiz'
        });
        return;
    }    
    else if (input.startsWith('/setybquiz ') && isRoomAdmin) {  //押宝答题
        const quiz_options = input.substring(11).trim();
        // 必须设置答题时间
        if (quiz_options.indexOf('{') == -1) {
            alert('必须设置答题时间，格式为：/setybquiz 玩玩石头剪刀布{30},石头,剪刀*,布');
            return;
        }
        // 确认是否设置正确答案，*号表示正确答案，如果没有*号，则随机选择一个正确答案
        if (quiz_options.indexOf('*') == -1) {
            if (confirm('没有设置正确答案，是否随机选择一个正确答案')) {
                // 随机选择一个正确答案
            }
            else {
                alert('请重新设置一个正确答案，格式为：/setybquiz 玩玩石头剪刀布{30},石头,剪刀*,布');
                return;
            }
        }
        socket.emit('init_poll', {
            room: currentRoomId,
            poll_options: quiz_options,
            poll_type: 'yuanbao_quiz'
        });
        return;
    }
    else if (input.startsWith('/whoislucky ') && isRoomAdmin) {
        // /whoislucky 30
        seconds = input.substring(12).trim();
        if (seconds == '') {
            seconds = 30;
        }
        poll_options = "谁是幸运儿{" + seconds + "},红,绿,蓝,橙,紫,青"          
        //poll_options = "谁是幸运儿{" + seconds + "},石头,剪刀,布"          
        socket.emit('init_poll', {
            room: currentRoomId,
            poll_options: poll_options,
            poll_type: 'yuanbao_quiz'
        });
        return;
    }
    else if (input.startsWith('/ai ')) {  //必须有空格和后续输入
        question = input.substring(4).trim();
        socket.emit('ai_query', {
            room: currentRoomId,
            username: currentUsername,
            uid: currentUid,
            question: question
        });
        return;
    }
    else if (input.startsWith('/translate ')) { //必须有空格和后续输入
        question = input.substring(10).trim();
        question = "翻译：" + question;
        socket.emit('ai_query', {
            room: currentRoomId,
            username: currentUsername,
            uid: currentUid,
            question: question
        });
        return;
    }
    else if (input.startsWith('/yuanbaosend')) {
        // 解析命令: /yuanbaosend 用户名 金额
        // 确保格式正确
        to_user = input.substring(13, input.indexOf(' ', 13)).trim();
        req_amount = input.substring(input.indexOf(' ', 13) + 1).trim();   
        if (to_user == '' || req_amount == '') {
            alert('格式错误，请输入 /yuanbaosend 用户名 金额');
            return;
        }
        sendYuanbao(to_user, req_amount);
        
        return;
    }
    else if (input.startsWith('/window') && isRoomAdmin) {
        socket.emit('update_server_room_settings', {
            msgtype: 'window',
            room: currentRoomId,
            message: input.substring(8).trim()
        });
        return;
    }
    else if (input.startsWith('/settopic ')) {
        socket.emit('update_server_room_settings', {
            msgtype: 'set_topic',
            room: currentRoomId,
            message: input.substring(10).trim()
        });
        return;
    }
    else if (input.startsWith('/topic ')) {
        socket.emit('update_server_room_settings', {
            msgtype: 'toggle_topic',
            room: currentRoomId,
            message: input.substring(7).trim()
        });
        return;
    }
    else if (input.startsWith('/reload') && isRoomAdmin) {
        socket.emit('update_server_room_settings', {
            msgtype: 'force_reload',
            room: currentRoomId,
            message: 'reload'
        });
        return;
    }
    else if (input.startsWith('/aiquestion ') && isRoomAdmin) {
        question = input.substring(12).trim();
        time_length = 30;
        if (question.indexOf('{') != -1) {
            time_length = question.substring(question.indexOf('{') + 1, question.indexOf('}')).trim();
            question = question.substring(0, question.indexOf('{')).trim();
        }
        socket.emit('ai_question', {
            room: currentRoomId,
            username: currentUsername,
            uid: currentUid,
            question: question,
            time_length: time_length
        });
    }
    else {
        alert('不支持指令，请输入/help查看支持的指令');
    }
}


function initAIInputBar() {
    // 初始化AI输入栏

    thinking_switch = document.getElementById('thinking-switch');        
    if (thinking_switch) {
        thinking_switch.checked = currentUserSetting.ai_thinking;
        if (thinking_switch.checked) {
            $('#ai-input-bar .chat-think').toggleClass('active');            
        }
        
        thinking_switch.addEventListener('change', function() {
            workAIStreaming('thinking');
        });
    }    

    taobaosearch_switch = document.getElementById('taobaosearch-switch');        
    if (taobaosearch_switch) {
        taobaosearch_switch.checked = currentUserSetting.taobaosearch;
        if (taobaosearch_switch.checked) {
            $('#ai-input-bar .chat-taobaosearch').toggleClass('active');            
        }
        
        taobaosearch_switch.addEventListener('change', function() {
            workAIStreaming('taobaosearch');
        });
    }    

    // 通义模型
    tongyi_switch = document.getElementById('tongyi-switch');
    deepseek_switch = document.getElementById('deepseek-switch');
    if (tongyi_switch) {
        tongyi_switch.checked = currentUserSetting.ai_tongyi;
        if (tongyi_switch.checked) {
            $('#ai-input-bar .chat-tongyi').toggleClass('active');
            // 确保 deepseek 关闭
            if (deepseek_switch) {
                deepseek_switch.checked = false;
                $('#ai-input-bar .chat-deepseek').removeClass('active');
            }
        }
        tongyi_switch.addEventListener('change', function() {
            if (this.checked && deepseek_switch) {
                // 如果启用 tongyi，则禁用 deepseek
                deepseek_switch.checked = false;
                $('#ai-input-bar .chat-deepseek').removeClass('active');
            }
            workAIStreaming('tongyi');
        });
    }
    // DeepSeek 模型    
    if (deepseek_switch) {
        deepseek_switch.checked = currentUserSetting.ai_deepseek;
        if (deepseek_switch.checked) { 
            $('#ai-input-bar .chat-deepseek').toggleClass('active');
            // 确保 tongyi 关闭
            if (tongyi_switch) {
                tongyi_switch.checked = false;
                $('#ai-input-bar .chat-tongyi').removeClass('active');
            }
        }
        deepseek_switch.addEventListener('change', function() {
            if (this.checked && tongyi_switch) {
                // 如果启用 deepseek，则禁用 tongyi
                tongyi_switch.checked = false;
                $('#ai-input-bar .chat-tongyi').removeClass('active');
            }
            workAIStreaming('deepseek');
        });
    }

    
}
    
function sendAiInput(action) {
    const question = action;
    if (question == "") {
        alert('请输入要AI回答的问题');
        return;
    }
        
    socket.emit('ai_query', {
        room: currentRoomId,
        username: currentUsername,
        question: question
    });
}

function workAIStreaming(action) {    
    if (action == 'newchat') {
        socket.emit('chat_ai_streaming', {
            room: currentRoomId,
            uid: currentUid,
            message_id: message_id,
            msgtype: 'newchat'
        });
    }
    else if (action == 'stop') {
        message_id = currentLastMessageId;
        if (message_id != '') {
            socket.emit('chat_ai_streaming', {
                room: currentRoomId,
                uid: currentUid,
                message_id: message_id,
                msgtype: 'stop'
            });
            $('#ai_loading_img').hide();
        }
    }
    else if (action == 'clearhistory') {
        socket.emit('chat_ai_streaming', {
            room: currentRoomId,
            uid: currentUid,
            msgtype: 'clearhistory'
        });
        clearRightPanel();
    }
    else if (action == 'thinking' || action == 'taobaosearch' || action == 'deepseek' || action == 'tongyi') {
        switch_status = document.getElementById(action + '-switch').checked ? 'on' : 'off';
        socket.emit('chat_ai_streaming', {
            room: currentRoomId,
            uid: currentUid,
            msgtype: action,
            status: switch_status
        });
    }    
}

function showSearchResultBar(data) {
    console.log('showSearchResult:', data);
        
    const chatTopicBar = $('#right_panel');
    
    chatTopicBar.show();
    chatTopicBar.empty();
    chatTopicBar.append(`
        <div class="items-right-header">
        <div class="items-right-title">AI搜索结果</div>
        <div class="items-right-close" onclick="closeTopicBar()"></div>
        </div>
        <div class="items-right-content"></div>`
    );
    let MessagesHtml = '';
    $('.items-right-content').empty();  
    
    const item_list = data.items;
    const recommended = data.recommended;

    // for (let i = 0; i < recommended.length; i++) {
    //     const recommended_item = recommended[i];
    //     MessagesHtml += `<div class="recommended-item" onclick="sendDirectMessage('${recommended_item}')">${recommended_item}</div>`;
    // }

    for (let i = 0; i < item_list.length; i++) {
        const item = item_list[i];
        const item_url = item.item_url;
        const item_pic = item.pic_path;
        const item_title = item.spuTitle || item.title;
        const item_price = item.price;
        MessagesHtml += `
            <a href="${item_url}" target="_blank" class="items-right-item">
            <div class="items-right-item-img">
                <img src="${item_pic}" />
            </div>
            <div class="items-right-item-info">
                <div class="items-right-item-title">
                <img
                    class="title-pic"
                    src="https://gw.alicdn.com/imgextra/i4/O1CN01NxhXgm1aayW5qVjuE_!!6000000003347-2-tps-153-42.png"
                />
                <span>${item_title}</span>
                </div>
                <div class="items-right-item-price">
                <div class="price">
                    <span class="unit">￥</span><span class="num">${item_price}</span>券后价
                </div>
                <div class="realSales">${item.realSales}人付款</div>
                </div>
                <div class="items-right-item-store">
                    ${item.shopTitle}
                    <img class="wangwang" src="https://gw.alicdn.com/imgextra/i1/O1CN01a6GFt71TDtOYMalbz_!!6000000002349-2-tps-28-28.png" />
                </div>
            </div>
            </div>
        `;
    }
    
    $('.items-right-content').append(MessagesHtml);
}

socket.on('update_search_result', function(data) {
    console.log('socket on update_search_result', data);
    
    localStorage.setItem('current_search_result', JSON.stringify(data));

    showSearchResultBar(data);

    if (isMobile()) {
        insertImgs(data);
        $(".items-thumbnail").css("display", "flex");
        $('#right_panel').hide();
    }
            
});


function inputPreview(message) {
    $('#chat-input').val(message);
    $('#chat-input').focus();
}

// 修改发送消息函数
function inputMessage() {
    const messageInput = $('#chat-input');
    const message = messageInput.val().trim();

    addToMessageHistory(message);

    // 如果是管理员，则处理聊天室指令
    if (message.startsWith('/')) {
        processRoomCommand(message);
        messageInput.val('');
        return;
    }

    // 如果话题后没有内容, 比如 #话题 后没有内容，则不发送消息
    if (message.startsWith('#')) {    
        message_content = message.substring(message.indexOf(' ') + 1).trim();
        if (message.indexOf(' ') == -1 || message_content.length < 2) {
            alert('请在话题后说点什么吧，不少于2个字哦');
            $('#chat-input').focus();
            return;
        }
    }

    // 清楚搜索结果浏览器缓存
    localStorage.removeItem('current_search_result');

    let image_url = $('#chat-image-preview-url').val();
    if (image_url) {

        sendImageMessage(image_url, message);

        try {
            if (message.startsWith('#')) {
                var topic = message.split(' ')[0];
                for (let i = 0; i < window.topic_tags.length; i++) {
                    if (`#${window.topic_tags[i]}` == topic) {
                        const topicSetDate = localStorage.getItem(window.topic_tags[i]);
                        if (getDate() != topicSetDate) {
                            drawPrize(window.topic_tags[i]);
                        }
                        break;
                    }
                }
            }
        } catch (e) {
            console.log('抽奖出错:', e);
        }
        
        $('#chat-image-preview-url').val('');
        $('#chat-image-preview').css('opacity', '0.5');
        $('#chat-image-preview').html('');
        $('#chat-input').focus();    
        $('#chat-input').val('');
        return;
    }
        
    if (message !== '') {
        // 如果socket断开了，先尝试重连
        console.log('sendMessage', socket.connected);
        if (!socket.connected) {
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                console.log('正在尝试重新连接服务器...');
                reconnectSocket().then(() => {
                    // 重连成功后继续原有的发送消息逻辑
                    console.log('重连成功，继续发送消息');
                    socketSendMessage();
                }).catch(() => {
                    console.log('连接服务器失败，请刷新页面重试');
                });
                return;
            } else {
                console.log('连接已断开，请刷新页面重试');
                return;
            }
        }
        else{
            console.log('socket connected, send message');
        }
        socketSendMessage();
        // 发送消息后，修改聊天状态
        window.isChatting = true;
        updateButtonStatus();
    }

    sendGoldlog('/pcbbs.chatroom.sendmessage', 'chatroom.sendmessage', {})
}

function sendImageMessage(file_url, message, msgtype='image') {
    if (!file_url) {
        alert('请先上传图片');
        return;
    }

    // 激活摸鱼计时器
    lastMessageTime = Date.now();   
    isTracking = true;

    console.log('sendImageMessage', file_url);
    socket.emit('image_message', {
        message: message,
        image: file_url,
        color: userColor,
        msgtype: msgtype,
        room: currentRoomId,
        username: currentUsername,
        uid: currentUid
    });

    sendGoldlog('/pcbbs.chatroom.sendpic', 'chatroom.sendpic', {})
}

// 添加重连函数
function reconnectSocket() {
    return new Promise((resolve, reject) => {
        if (isReconnecting) {
            reject('正在重连中');
            return;
        }
        
        isReconnecting = true;
        reconnectAttempts++;
        
        console.log('开始重连尝试:', reconnectAttempts);
        updateSocketStatus('disconnected');
        
        // 清理旧的事件监听器
        socket.off('connect');
        socket.off('connect_error');
        
        // 尝试重新连接
        socket.connect();
        
        
        // 设置超时
        const timeout = setTimeout(() => {
            socket.off('connect');
            isReconnecting = false;
            reject('重连超时');
        }, 5000);
        
        // 监听连接成功
        socket.once('connect', () => {
            clearTimeout(timeout);
            isReconnecting = false;
            updateSocketStatus('connected');
            
            // 重新加入房间
            socket.emit('join', {room_id: currentRoomId}, (response) => {
                if (response && response.status === 'success') {
                    startHeartbeat();
                    resolve();
                } else {
                    reject('加入房间失败');
                }
            });
        });
        
        // 监听连接错误
        socket.once('connect_error', (error) => {
            clearTimeout(timeout);
            isReconnecting = false;
            reject(`连接错误: ${error.message}`);
        });
    });
}



// 添加连接错误处理
socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        sysmessage = '连接失败，请刷新页面重试';
        displaySystemMessage(sysmessage);
    }
});


// 退出登录
$('#logout').click(() => {
    window.location.href = '/logout?room=' + currentRoomId;  // 调用后端的退出登录路由
});

$('#chat-input').on('input', function() {

    if (currentRoomSetting.personal_chat) {
        $('#user-suggestions').hide();
        return;
    }

    checkMessageLength();
    // 用户名快捷建议
    const input = $(this).val();
    const lastAtIndex = input.lastIndexOf('@');
    if (lastAtIndex !== -1) {
        const query = input.substring(lastAtIndex + 1).toLowerCase();
        let suggestions = online_users.filter(user => user.toLowerCase().startsWith(query));
        
        
        // 确保 KBox 总是在建议列表中
        const bot_username = currentRoomBot;
        if (`@${bot_username}`.startsWith(query) && !suggestions.includes(bot_username)) {
            suggestions.unshift(bot_username);
        }

        if (suggestions.length > 0) {
            $('#user-suggestions').empty().show();
            suggestions.forEach(user => {
                $('#user-suggestions').append(`<li class="list-group-item" onclick="selectUser('${user}')">${user}</li>`);
            });
        } else {
            $('#user-suggestions').hide();
        }
    } else {
        $('#user-suggestions').hide();
    }

    // 聊天室指令，/help /kick /broadcast 
    if (isRoomAdmin && input.startsWith('/')) {
        // filter
        
        $('#user-suggestions').hide();
        // 增加指令菜单
        $('#user-suggestions').show();
        if (isRoomAdmin) {
            $('#user-suggestions').empty();
            const commands = [
                {cmd: '/help', desc: '帮助'},
                {cmd: '/poll', desc: '投票开关'},
                {cmd: '/setpoll', desc: '投票选项'},
                {cmd: '/quiz', desc: '答题开关'},
                {cmd: '/setquiz', desc: '答题(*正确题目)'},
                {cmd: '/setybquiz', desc: '押宝答题(*正确题目)'},
                {cmd: '/whoislucky 30', desc: '谁是幸运儿'},
                {cmd: '/yuanbaosend', desc: '发送元宝'},
                {cmd: '/broadcast', desc: '聊天室广播'},
                {cmd: '/aiquestion', desc: 'AI出题'},
                {cmd: '/window', desc: '小窗消息'},
                {cmd: '/settopic 热点话题 1', desc: '新话题标签'},
                {cmd: '/topic 热点话题', desc: '话题面板开关'},
                {cmd: '/ai', desc: '个人AI小助理'},
                {cmd: '/translate', desc: '英文翻译'}
            ];

            let selected_cmd_length = 0;
            let selected_cmd_string = '';
            commands.forEach(({cmd, desc}) => {
                if (cmd.startsWith(input)) {
                    selected_cmd_length ++;
                    selected_cmd_string = cmd;
                    $('#user-suggestions').append(`<li class="list-group-item" onclick="selectUser('${cmd}')">${cmd} ${desc}</li>`);
                }
            });
           
        }
    }
});



var scrollBottom = true;
function checkIsBottom() {
    var height = $('#messages')[0].offsetHeight;
    var scrollTop =  $('#messages')[0].scrollTop;
    var scrollHeight = $('#messages')[0].scrollHeight;
    //console.info(height+scrollTop, scrollHeight);
    if(height + scrollTop < scrollHeight + 40 && height + scrollTop > scrollHeight - 40) {
        scrollBottom = true;
    } else {
        scrollBottom = false;
    }
}
function handleScroll() {
    //console.info(scrollBottom, 111);
    if(scrollBottom) {
        $('#messages').scrollTop($('#messages')[0].scrollHeight);
    }
}

function selectUser(username) {
    const input = $('#chat-input');
    const currentText = input.val();
    const lastAtIndex = currentText.lastIndexOf('@');
    const newText = currentText.substring(0, lastAtIndex + 1) + username + ' ';
    input.val(newText);
    $('#user-suggestions').hide();
    input.focus();
}

// 添加点击用户名的事件处理
$(document).on('click', '.message-username', function() {
    const username = $(this)[0].innerText;
    onClickUsername(username);
});

// 添加点击用户名的事件处理
$(document).on('click', '.user-name', function() {
    const username = $(this).data('username');
    onClickUsername(username);
});

function onClickUsername(username) {
    const chatInput = $('#chat-input');
    const currentText = chatInput.val();
    //const newText = currentText + `@${username} `;
    let newText = '';
    if (currentText.startsWith('/yuanbaosend')) {
        newText = currentText.substring(0, currentText.indexOf(' ')) + ` ${username} 1`;
    }
    else {
        newText = `@${username} `;
    }
    chatInput.val(newText);
    chatInput.focus();
}

// 添加点击消息内容后，引用回复的事件处理,双击消息内容
$(document).on('dblclick', '.message-text', function() {
    const content = $(this).text();
    const username = $(this).closest('.message').find('.message-username').text();
    const chatInput = $('#chat-input');
    const newText = `[ @${username} : ${content} ] `;
    chatInput.val(newText);
    chatInput.focus();
});

// 点空白处隐藏用户建议列表
$(document).on('click', function(e) {
    if (!$(e.target).closest('#user-suggestions').length && !$(e.target).is('#chat-input')) {
        $('#user-suggestions').hide();
    }
    
    if (currentRoomSetting.zero_chat) {    
        return;
    }


    if (!$(e.target).closest('#chat-topic-bar').length && !$(e.target).is('.topic-tag') && !$(e.target).is('#chat-input') && !$(e.target).is('.chat-image') && !$(e.target).is('.img-close') && !$(e.target).is('#at-me-tag')  && !$(e.target).is('#at-me-tag i') && !$(e.target).is('#at-me-number') && !$(e.target).is('#i-like-tag') && !$(e.target).is('#i-like-tag i') && !$(e.target).is('#i-like-number')) {
        $('#chat-topic-bar').hide();
    }
    
});

// 添加侧边栏切换功能
$('#sidebar-toggle').click(function() {
    $('#sidebar').toggleClass('active');
    if ($('#sidebar').hasClass('active')) {
        $('#main-chat-area').removeClass('col-md-9').addClass('col-md-6');
        $('#sidebar').css('right', '0');
    } else {
        $('#main-chat-area').removeClass('col-md-6').addClass('col-md-9');
        $('#sidebar').css('right', '-450px');
    }
});




socket.on('user_joined', (data) => {
    //console.log('收到 user_joined 事件:', data);
    let new_user = data.new_user;    

    const username = data.username;
    const uid = data.uid; 
    onlineUidbyName[username] = uid;
   
        
    displayWelcomeMessage(data.username, new_user);
    

});

socket.on('user_left', (data) => {
    // 退出不再提醒
    //$('#messages').append(`<div class="system-message">${data.username} 离开了聊天室</div>`);
});

var notify_deadline_time = ''

// 设置定时器，倒计时按照HH:MM:SS格式，显示剩余的时间，每秒更新一次，时间到了后，系统提示"设定时间到"
function setNotifyTimer() {
    // 将HH:MM:SS格式转换为总秒数
    let [hours, minutes, seconds] = notify_deadline_time.split(':').map(Number);
    let nowDate = new Date(Date.now() + serverClientTimeDiff);
    let now_seconds = nowDate.getHours() * 3600 + nowDate.getMinutes() * 60 + nowDate.getSeconds();
    let totalSeconds = hours * 3600 + minutes * 60 + seconds - now_seconds;
    
    // 清除之前的计时器
    if (window.notifyTimer) {
        clearInterval(window.notifyTimer);
    }
    
    const timer = setInterval(() => {
        if (totalSeconds <= 0) {
            clearInterval(timer);
            if (totalSeconds > -60) {   // 剩余时间小于60秒，显示"设定时间到"
                //displaySystemMessage('设定时间到');
                message_notify += ' （已结束）';
                ChatEffects.checkAndPlay(30, '时间到');
                clearInterval(window.notifyTimer);
            }
            const message_notify_html = `<div class="message-room-notify"><span class="message-room-notify-icon"></span> ${message_notify}</div>`;
            $('#chat-header').html(message_notify_html);
            return;
        }

        // 将总秒数转回HH:MM:SS格式
        let h = Math.floor(totalSeconds / 3600);
        let m = Math.floor((totalSeconds % 3600) / 60);
        let s = totalSeconds % 60;
        let timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        
        const message_notify_with_timer = `${message_notify} [${timeStr}]`;
        const message_notify_html = `<div class="message-room-notify"><span class="message-room-notify-icon"></span> ${message_notify_with_timer} </div>`;
        $('#chat-header').html(message_notify_html);
        
        totalSeconds--;
    }, 1000);

    // 保存timer ID以便需要时清除
    window.notifyTimer = timer;
}

// 更新房间设置(包含通知消息、小窗消息和话题标签)
socket.on('update_room_settings', (data) => {
    const msgtype = data.msgtype;  // 消息类型( notify, window, topic)        
        
    if (msgtype == 'notify') {
        const message = data.message || '';        
        updateNotifyMessage(message);
    }
    else if (msgtype == 'window') {
        const message = data.message || '';
        const open = data.open || false;
        const room_id = data.room || '';
        updateClientWindowMessage(message, open, room_id);
    }
    else if (msgtype == 'set_topic') {
        const topic_tags = data.message || [];
        updateTopicTags(topic_tags);
    }
    else if (msgtype == 'toggle_topic' && !isMobile()) {  // 只在PC端置顶话题面板
        console.log('toggle_topic:', data);
        const topic = data.message || '';
        const open = data.open || false;
        if (open) {
            showTopicContent("#"+topic);
        }
        else {
            closeTopicBar();
        }
    }
    else if (msgtype == 'popmsg') {
        const msgTitle = data.title || '';
        const msgHtml = data.message || '';
        showWelcomeModal(msgTitle, msgHtml);
    }
    else if (msgtype == 'room_stats') {
        const room = data.room || '';
        const stats = data.message || [];
        updateRoomStats(room, stats);
    }
});

function getFormattedDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getRoomStats() {
    if (!currentUserSetting.is_logged) {
        return;
    }
    socket.emit('update_server_room_settings', {'msgtype': 'get_stats', 'room': currentRoomId,'message': ''});
}

function updateRoomStats(room, stats) {
    console.log('updateRoomStats, room:', room, 'stats:', stats);
    const room_stats = $('#room-stats');
    room_stats.empty();
    stats_chat = stats.chat;
    stats_visit = stats.visit;  
    today_date = getFormattedDate();
    console.log('today_date:', today_date);
    room_stats.append(`<h7>每日聊天数据(日期/人数/消息数)</h7>`);
    let count_per_user = 0;
    let today_chat_uv = 0;
    stats_chat.forEach(stat => {
        count_per_user = (stat.message_count / stat.user_count).toFixed(1);
        if (stat.thedate == today_date) {  
            today_chat_uv = stat.user_count;
            room_stats.append(`<div class="room-stats-today"><span class="date-title">${stat.thedate}</span> <span class="user-count">${stat.user_count}</span> <span class="message-count">${stat.message_count}</span> </div>`);
        }
        else {
            room_stats.append(`<div class="room-stats-date"><span class="date-title">${stat.thedate}</span> <span class="user-count">${stat.user_count}</span> <span class="message-count" alt="${count_per_user}">${stat.message_count}</span> </div>`);
        }
    });
    room_stats.append(`<h7>今日访问数据(访问人数/新用户/次数)</h7>`);
    room_stats.append(`<div class="room-stats-today"><span class="date-title">今日访问</span> <span class="user-count">${stats_visit.today_uv}(${stats_visit.today_new_uv})</span> <span class="message-count">${stats_visit.today_pv}</span></div>`);
    room_active_rate = ((today_chat_uv / stats_visit.today_uv) * 100).toFixed(2);
    room_stats.append(`<div class="room-stats-date"><span class="date-title">聊天活跃率</span> <span class="user-count">${room_active_rate}%</span> <span class="message-count"></span></div>`);
    
    
}

function updateTopicTags(topic_tags) {
    window.topic_tags = [];
    const topic_tag_group = $('#ai-input-bar').find('.topic-tag-group');
    topic_tag_group.empty();
    //console.log('updateTopicTags, topic_tags:', topic_tags);
    topic_tags.forEach(topic => {
        tag_name = topic.tag;
        window.topic_tags.push(tag_name);
        tag_color = topic.tag_color;
        //console.log('updateTopicTags, tag_name:', tag_name, 'tag_color:', tag_color);
        topic_tag_group.append(`<div class="topic-tag" onclick="setTopicTag('#${tag_name}')">#${tag_name}</div>`);
    });
}

function updateNotifyMessage(message) {   
    message_notify = message; 
    // 清除之前的计时器
    if (window.notifyTimer) {
        clearInterval(window.notifyTimer);
    }
    
    //将URL链接转换成可点击的链接    
    message_notify = message_notify.replace(/\bhttps?:\/\/[^\s/$.?#].[^\s]*\b/g, function(url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">点击链接</a>`;
    });

    if (message_notify) {
        $('#chat-header').css("display", "flex");
        // 提取时间格式{HH:MM:SS}
        const timeMatch = message_notify.match(/\{(\d{2}:\d{2}:\d{2})\}/);
        if (timeMatch) {
            notify_deadline_time = timeMatch[1];
            message_notify = message_notify.replace(/\{\d{2}:\d{2}:\d{2}\}/, '').trim();
            setNotifyTimer();
        } else {
            const message_notify_html = `<div class="message-room-notify"><span class="message-room-notify-icon"></span> ${message_notify} </div>`;
            $('#chat-header').html(message_notify_html);
        }
    } else {
        $('#chat-header').css("display", "none");
        $('#chat-header').empty();
    }
}

// 更新管理员面板
function updateManagerPanel() {
    const panel = $('#manager_panel_content');
    let html = '';    
    html += '<div class="manager-panel-switch">';    
    
    
    html += '<h7>聊天室统计(每分钟自动更新)</h7>';
    html += `<input type="button" class="manager-panel-switch-button" value="更新聊天室统计" onclick="getRoomStats()">`;
    html += `<div id="room-stats"></div>`;


    html += '<h7>快捷操作</h7>';
    let command_list = [
                {cmd: '/poll', desc: '投票开关'},                
                {cmd: '/quiz', desc: '答题开关'},
                {cmd: '/setpoll', desc: '设置投票'},
                {cmd: '/setquiz', desc: '设置答题(*正确题目)'},
                {cmd: '/setybquiz', desc: '设置押宝答题(*正确题目)'},
                {cmd: '/whoislucky 30', desc: '谁是幸运儿'},
                {cmd: '/yuanbaosend', desc: '发送元宝'},
                {cmd: '/broadcast', desc: '聊天室广播'},
                {cmd: '/window', desc: '小窗消息'},
                {cmd: '/settopic 热点话题 1', desc: '新话题标签'},
                {cmd: '/topic 热点话题', desc: '话题面板开关'}
    ];
    command_list.forEach(command => {
        html += `<input type="button" class="manager-panel-switch-button" value="${command.desc}" onclick="selectUser('${command.cmd}')">`;
    });

    
    html += '<h7>聊天室全员POP通知（谨慎使用）</h7>';
    // 发送POP通知    
    html += `<input type="text" class="manager-panel-switch-input" id="popmsg-title" placeholder="请输入POP通知标题" value="${currentRoomName}-通知">`;
    html += `<textarea class="manager-panel-switch-input" id="popmsg-message" placeholder="请输入POP通知内容" rows="3" cols="30"></textarea>`;
    html += `<input type="button" class="manager-panel-switch-button" value="发送POP通知" onclick="sendPopMsg()">`;


    html += '</div>';
    panel.html(html);
}

function sendPopMsg() {
    const title = $('#popmsg-title').val();
    const message = $('#popmsg-message').val();
    if (!title || !message) {
        alert('请输入POP通知标题和内容');
        return;
    }
    socket.emit('update_server_room_settings', {msgtype: 'set_popmsg', room: currentRoomId, title: title, message: message});
}

var room_stats_interval = null;
$(document).on('click', '#manager_panel .close-btn', function() {
    $('#manager_panel').hide();
    if (room_stats_interval) {
        clearInterval(room_stats_interval);
    }
});

$(document).on('click', '#manager_panel_button', function() {
    $('#manager_panel').show();
    getRoomStats();
    room_stats_interval = setInterval(getRoomStats, 60000);  // 每分钟更新一次
});



// 更新小窗的内容
function updateClientWindowMessage(message, window_open,room_id) {
    if (!room_id || room_id != currentRoomId) {
        //console.log('update_client_window_message, room_id not match, ignore');
        return;
    }
    //console.log('update_client_window_message, room_id match, update: ', message);
    const panel = $('.floating-panel');
    if (message && message.trim() != '' && message.trim().length > 3) {
        //panel.removeClass('minimized');
        if (window_open && panel.hasClass('minimized')) {
            panel.find('.minimize-btn').click();  // 打开小窗
        }
        panel.find('.panel-content').html(message);
    } else {
        if (!panel.hasClass('minimized')) {
            panel.addClass('minimized');                        
        }
        
    }
}

var correct_poll_nicklist = [];

socket.on('update_poll', (data) => {
    console.log('收到 update_poll 事件:', data);
    const poll_info = data.poll_info;
    const poll_status = poll_info.status;
    const poll_options = data.poll_options;
    const poll_type = data.poll_type;
    const poll_results = data.poll_results;
    const poll_require_yuanbao = data.poll_require_yuanbao;
    const poll_yuanbao_per_user = poll_info.yuanbao_per_user;
    if (!poll_info || !poll_options || poll_options.length == 0 || poll_status == 0) {
        $('#poll-area').hide();
        return;
    }
    else {
        $('#poll-area').show();
    }    
    total_votes = Object.keys(poll_results).length;
    // 第一排显示投票的标题，总共投票的人数
    // 第二排在投票区域显示彩色的投票进度，一排显示所有投票选项，显示投票的百分比，采用该颜色的投票颜色，每个区域的宽度一致
    
    const poll_area = $('#poll-area');
    const width_per_option = (100/poll_options.length).toFixed(2);
    poll_area.empty();   
    let poll_title = '';
    if (poll_type == 'poll') {
        poll_title = "投票："+poll_info.title;
    }
    else if (poll_type == 'quiz') {
        poll_title = "答题："+poll_info.title;
    }
    else if (poll_type == 'yuanbao_quiz') {
        poll_title = "<span class='yuanbao-quiz-icon'></span>押宝答题("+poll_info.require_yuanbao+"元宝)："+poll_info.title;
        yuanbao_amount = poll_info.require_yuanbao;
        updateYuanbaoBalance();
    }
    
    const poll_total_votes = total_votes;
    poll_area.append(`<div class="poll-title">${poll_title} <span class="poll-total-votes">(${poll_total_votes}票)</span></div>`);
    let html_options = '<div class="poll-options">';
    let poll_right_option_id = 0;
    poll_options.forEach(option => {
        const label = option.title;
        let color = option.color;
        const votes = option.votes;
        const option_id = option.id;
        let option_answer = option.answer;
        if (poll_type=='quiz' || poll_type=='yuanbao_quiz') {
            if (poll_status == 2 && option_answer != 1) {
                color = '#ccc';  // 非正确答案，颜色变灰
            }

            if (option_answer == 1) {
                poll_right_option_id = option_id;
            }
        }
        html_options += '<div class="poll-option" style="background-color: '+color+'; " data-option-id="'+option_id+'" data-option-status="'+poll_status+'" data-option-answer="'+option_answer+'" data-poll-type="'+poll_type+'" >'+label+' ';
        if (poll_type == 'poll' || poll_status == 2) {  // 仅投票显示投票数, 或者答题结束2可以显示投票结果
            html_options += '<span class="poll-votes-count">'+votes+'</span>';
        }
        html_options += '</div>';
    
    });
    html_options += '</div>';
    poll_area.append(html_options);

    // 获取投票成功的用户列表
    correct_poll_nicklist = [];
    for (const [username, result] of Object.entries(poll_results)) {
        if (result.option == poll_right_option_id) {
            correct_poll_nicklist.push(username);
        }
    }
    

    // 只显示前50个投票
    const poll_results_top50 = Object.entries(poll_results).slice(0, 50);
    let html_results = '<div class="poll-results">';
    
    for (const [username, result] of poll_results_top50) {
        // "nickname1": {   "option": 1,"color": "#00FF00"}
        const option = result.option;
        let color = result.color;
        if (poll_status == 2) {
            if (option != poll_right_option_id) {
                color = '#ccc';  // 非正确答案，颜色变灰
            }            
        }
        if (poll_type == 'poll' || poll_status == 2) {  // 仅投票显示投票数, 或者答题结束2可以显示投票结果            
            html_results += '<span class="poll-result" style="color: '+color+';" data-option="'+option+'">'+username;
            if (poll_status == 2 && option == poll_right_option_id && poll_yuanbao_per_user>0) {
                html_results += '(+'+poll_yuanbao_per_user+')';
            }
            html_results += '</span>';
        }
        else if (poll_type == 'quiz' || poll_type == 'yuanbao_quiz') {  // 答题显示答题数,不显示具体的票
            
            html_results += '<span class="poll-result">'+username+'</span>';
        }
    }
    html_results += '</div>';    
    poll_area.append(html_results);
});

$(document).on('click', '.poll-option', function() {
    const option_id = $(this).data('option-id');    
    const option_status = $(this).data('option-status');
    const poll_type = $(this).data('poll-type');
    if (option_status == 2) {
        alert('投票已结束');
        displaySystemMessage('投票已结束');
        return;
    }
    if (poll_type == 'yuanbao_quiz') {
        if (currentYuanbaoBalance < 10) {  // 至少10元宝才能参与该游戏
            alert('元宝余额不足，无法参与押宝答题');
            displaySystemMessage('元宝余额不足，无法参与押宝答题');
            return;
        }
        showConfirm('确定要押宝答题吗？获胜会瓜分参与者的元宝，失败者会被扣除元宝，如果无人答对，元宝会全部自动退回', function() {
            // 禁用所有投票按钮，投票按钮的样式变灰。按钮禁用
            
            $('.poll-option').prop('disabled', true);
            $(this).css('background-color', '#ccc');
            $(this).addClass('disabled');

            socket.emit('do_poll', {room: currentRoomId, username: currentUsername, poll_id: option_id, poll_type: poll_type});            

        });
    }   
    else {
        // 禁用所有投票按钮
        $('.poll-option').prop('disabled', true);
        $(this).css('background-color', '#ccc');
        $(this).addClass('disabled');

        socket.emit('do_poll', {room: currentRoomId, username: currentUsername, poll_id: option_id, poll_type: poll_type});
        
    }
});

// 解决iOS窗口大小变化时，页面高度不随之变化的问题
function onResize() {
    document.body.style.height = window.innerHeight + 'px'
    var app = document.getElementById('app')
    if (app) {
      app.style.height = window.innerHeight - 60 + 'px'
    }
  }
onResize()
window.addEventListener('resize', onResize)

// 移除处聊天消息的部分,避免消息重复发送

const COLORS = [
    "#1E90FF", "#8B4513", "#006400", "#8B008B", "#FF4500",
    "#2F4F4F", "#800000", "#000080", "#8B0000", "#4B0082"
];

let userColor = "#1E90FF";  // 默认颜色

socket.on('initial_color', (data) => {
    userColor = data.color;
    
});



// 添加全局错处理
window.onerror = function(message, source, lineno, colno, error) {
    console.error("Global error:", message, "at", source, "line:", lineno, "column:", colno, "error object:", error);
};



socket.on('connect_timeout', (timeout) => {
    console.error('Connection timeout:', timeout);
});

// 在页面卸载时断开 Socket.IO 连接
window.addEventListener('beforeunload', function() {
    socket.disconnect();
});



// 在用户离开页面时触发 leave 事件
$(window).on('beforeunload', function() {
    //socket.emit('leave', {room_id: currentRoom});
});

// 其他事件处理函数也需要类似的修改，确保包含 room 信息

// 处理标签页切换
$('.tab-btn').click(function() {
    $('.tab-btn').removeClass('active');
    $(this).addClass('active');
    
    const tabId = $(this).data('tab');
    $('.tab-content').removeClass('active');
    $(`#${tabId}-area`).addClass('active');
    
    if (tabId === 'rooms') {
        updateRoomsList();
    }
});


socket.on('update_yuanbao_balance', (data) => {    
    const value = data.yuanbao_balance;
    if (value != currentYuanbaoBalance) {
        currentYuanbaoBalance = value;
        console.log('update_yuanbao_balance to ' + currentYuanbaoBalance);
        $('.yuanbao-balance').html(`<a href="https://jianghu.taobao.com/coin.html" target="_blank">${currentYuanbaoBalance}</a>`);
    }

});

function updateYuanbaoBalance() {
    if (!currentUserSetting.is_logged) {
        return;
    }
    $.get('/yuanbao/balance', function(data) {
        //console.log('yuanbao_balance:', data);
        if (data.status == 'success') {
            currentYuanbaoBalance = data.balance;
            $('.yuanbao-balance').html(`<a href="https://jianghu.taobao.com/coin.html" target="_blank">${currentYuanbaoBalance}</a>`);

        }
    });
}


// 更新聊天室列表
var other_rooms = [];
var old_rooms_data = {};
function updateRoomsList() {
    if (!currentUserSetting.is_logged) {
        return;
    }
    url = '/rooms/list?room=' + currentRoomId;
    $.get(url, function(rooms) {
        if (JSON.stringify(old_rooms_data) === JSON.stringify(rooms)) {  // 如果数据没有变化，则不更新当前页面，减少无效刷新
            //console.log('rooms data not changed, ignore');
            return;
        }        
        old_rooms_data = rooms;
        //const currentRoomId = currentRoomId; // 当前房间ID
        joined_rooms = rooms.joined_rooms;
        //console.log('joined_rooms:', joined_rooms);
        active_rooms = rooms.active_rooms;
        other_rooms = [];
        at_message_unread = rooms.at_message_unread;
        // 消息红点
        if (at_message_unread > 0) {            
            updateAtMeNumber(at_message_unread);
        }        

        // 我已加入的房间
        const has_joined_rooms = []
        let roomHtml = '';
        joined_rooms.forEach(room => {        
            const isCurrentRoom = room.room_id === currentRoomId;
            const roomTypeLabel = getRoomTypeLabel(room.room_type);
            const roomTypeClass = getRoomTypeClass(room.room_type);    

            // 获取最新的2条消息
            const len = room.latest_messages.length;
            const max_len = 1;
            const lastest_2messages = []
            for (let i = len - 1; i >= len - max_len; i--) {
                lastest_2messages.push(room.latest_messages[i]);
            }           
            let lastest_2messages_html = ""
            if (lastest_2messages.length > 0) {
                for (const row of lastest_2messages) {
                    //console.log('row:', row);
                    if (row && row.nick && row.message) {  
                        lastest_2messages_html += `${row.nick}: ${row.message}<br>`;
                    }
                }
            }
            has_joined_rooms.push(room.room_id);
            if (!isCurrentRoom) {
                other_rooms.push(room); 
            }
            room_name = room.name.substring(0, 10);  // 截取长度

            roomHtml += `
                <div class="room-item ${isCurrentRoom ? 'current-room' : ''}" data-room-id="${room.room_id}" data-room-name="${room.name}" data-room-type="joined_room">
                    <div class="room-avatar">
                        <img src="${room.avatar_url}" alt="房间图标" width="48">
                    </div>
                    <div class="room-header" >                        
                        <div class="room-info">
                            <div class="room-name">
                                #${room_name}
                                ${roomTypeLabel ? `<span class="room-type-badge ${roomTypeClass}">${roomTypeLabel}</span>` : ''}
                                <span class="room-quit-btn"></span>
                            </div>                            
                            <div class="room-stats">
                                <span class="room-lastest-message">
                                    ${lastest_2messages_html}
                                </span>                                
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        $('#joined-rooms').html(roomHtml);

        // 其他活跃聊天室
        roomsHtml = '';
        
        active_rooms.forEach(room => {
            const isCurrentRoom = room.room_id === currentRoomId;
            const roomTypeLabel = getRoomTypeLabel(room.room_type);
            const roomTypeClass = getRoomTypeClass(room.room_type);
            if (has_joined_rooms.includes(room.room_id)) {
                return;
            }            
            roomsHtml += `
                <div class="room-item ${isCurrentRoom ? 'current-room' : ''}" data-room-id="${room.room_id}" data-room-name="${room.name}" data-room-type="active_room" data-room-locked="${room.is_locked}">
                    <div class="room-avatar">
                        <img src="${room.avatar_url}" alt="房间图标" width="48">
                    </div>
                    <div class="room-header" >                        
                        <div class="room-info">
                            <div class="room-name">
                                #${room.name}
                                ${roomTypeLabel ? `<span class="room-type-badge ${roomTypeClass}">${roomTypeLabel}</span>` : ''}
                                
                            </div>
                            <div class="room-desc">${room.room_desc || ''}</div>
                            <div class="room-stats">
                                <span class="users-count">
                                    <i class="fas fa-users"></i> <b>${room.online_usercount}</b>/ ${room.max_users}
                                </span>
                                ${room.is_locked == 1 ? '<span class="room-lock-badge"></span>' : ''}

                                ${isCurrentRoom ? 
                                    '<span class="current-badge"></span>' : 
                                    '<button class="room-join-btn"></button>'
                                }
                            </div>
                        </div>
                    </div>
                    <div class="room-footer">
                        
                    </div>
                </div>
            `;
            
        });
        
        $('#active-rooms').html(roomsHtml);
    });
}

// 顶部聊天室标题点击跳转到其他聊天室
$(document).on('click', '.navbar-room-name', function(e) {
    var positionInfo = $(this)[0].getBoundingClientRect();
    var roomsHtml = `<div class="pop-room-list" style="position: fixed; z-index: 2000; border-radius: 10px; left: ${positionInfo.left}px; top: ${positionInfo.top + 40}px; width: 50vw; background-color: #fff; border: 1px solid #ccc; padding: 10px;">`;
    other_rooms.forEach(room => {
        const isCurrentRoom = room.room_id === currentRoomId;
        const roomTypeLabel = getRoomTypeLabel(room.room_type);
        const roomTypeClass = getRoomTypeClass(room.room_type);
        
        roomsHtml += `
            <div class="room-item ${isCurrentRoom ? 'current-room' : ''}" data-room-id="${room.room_id}" data-room-name="${room.name}" data-room-type="other_room">
                <div class="room-avatar">
                    <img src="${room.avatar_url}" alt="房间图标" width="48">
                </div>
                <div class="room-header" >                        
                    <div class="room-info">
                        <div class="room-name">
                            # ${room.name}
                            ${roomTypeLabel ? `<span class="room-type-badge ${roomTypeClass}">${roomTypeLabel}</span>` : ''}
                            
                        </div>
                        <div class="room-desc">${room.room_desc || ''}</div>
                        <div class="room-stats">
                            <span class="users-count">
                                <i class="fas fa-users"></i> <b>${room.online_usercount}</b>/ ${room.max_users}
                            </span>
                            ${room.is_locked == 1 ? '<span class="room-lock-badge"></span>' : ''}

                            ${isCurrentRoom ? 
                                '<span class="current-badge"></span>' : 
                                '<button class="room-join-btn"></button>'
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    roomsHtml += '</div>';
    $("body").append(roomsHtml);
    e.preventDefault();
    e.stopPropagation();
});


// 处理分享事件
$(document).on('click', '.btn-invite', function(e) {
    e.stopPropagation();
    sendGoldlog('/pcbbs.chatroom.invitefriend', 'chatroom.invitefriend', {})
    
    // 获取invite——link

    $.get('/generate_invite_link/' + currentRoomId, function(data) {
        console.log('generate_invite_link:', data);
        invite_link = data.invite_link;
        invite_history = data.invite_history;
        $('#inviteLinkTextarea').val(invite_link);
        $('#inviteHistory').empty();
        for (const invite of invite_history) {
            join_time = new Date(invite.created_at).toLocaleString();
            $('#inviteHistory').append(`<li>${invite.new_nickname} 加入聊天室，你获得50元宝！（${join_time}）</li>`);
        }
        const qr_image_url = '/get_qrcode_image?room_id=' + currentRoomId;
        $('#room-qrcode').html(`<img src="${qr_image_url}" alt="房间二维码" width="150"><p style="font-size: 12px; color: #666;">欢迎来淘江湖谈天说地</p>`);
    });

});


// 处理聊天室点击事件
$(document).on('click', '.room-item', function(e) {
    e.stopPropagation();

    sendGoldlog('/pcbbs.chatroom.changeroom', 'chatroom.changeroom', {})

    const roomId = $(this).closest('.room-item').data('room-id');
    const roomName = $(this).closest('.room-item').data('room-name');
    const roomType = $(this).closest('.room-item').data('room-type');
   
    if (roomType == 'active_room'){
        
        const is_locked = $(this).closest('.room-item').data('room-locked');
        $('#roomName').text(roomName);
        $('#joinRoomModal').modal('show');    
        if (is_locked == 1) {                      
            $('#roomPasswordArea').show();
            $('#confirmJoinRoom').off("click").click(function() {
                const password = $('#roomPasscode').val();
                if (password == '' || password.length != 4) {
                    alert('请输入4位大写字母的聊天室口令');
                    return;
                }
                else {
                    window.location.href = `/login/${roomId}?passcode=${password}`;
                }
            });
        }
        else {                         
            $('#roomPasswordArea').hide();            
            $('#confirmJoinRoom').click(function() {
                if (currentRoomSetting.zero_chat) 
                    window.open(`/chat/${roomId}`, '_blank');
                else
                    window.location.href = `/chat/${roomId}`;
            });
        }
    }  //已加入房间切换
    else {
        if (currentRoomSetting.zero_chat) 
            window.open(`/chat/${roomId}`, '_blank');
        else
            window.location.href = `/chat/${roomId}`;
    }
});

$(document).on('click', '.room-quit-btn', function(e) {
    e.stopPropagation();
    console.log('room-quit-btn clicked');
    room_id = $(this).closest('.room-item').data('room-id');
    room_name = $(this).closest('.room-item').data('room-name');
    
    showConfirm('确定要注销该房间 [#'+room_name+'] 吗？再次进入房间将需要重新申请加入', function() {
            //socket.emit('leave', {room_id: room_id});            
        $.post('/rooms/quit', {
            current_room_id: currentRoomId,
            quit_room_id: room_id
        }, function(data) {
            console.log('rooms/quit:', data);
            if (data.status == 'success') {
                room_id = data.next_room_id;
                window.location.href = `/chat/${room_id}`;
            }
            else if (data.status == 'error' && data.next_room_id == 0) {
                console.log('已经没有可用房间');
                alert('已经没有可用房间');
                window.location.href = '/';
            }
        });
        
    });
});

// 关闭弹窗
$(document).on('click', 'body', function(e) {
    try {
        var list = $(".pop-room-list");
        if(list.length) {
            $(".pop-room-list").remove();
        }
    } catch (e) {
        console.error('Error:', e);
    }
});

// 获取房间类型标签
function getRoomTypeLabel(type) {
    switch(parseInt(type)) {
        case 1: return '(私密)';
        case 2: return '(VIP)';
        default: return '';
    }
}

// 获取房间类型样式类
function getRoomTypeClass(type) {
    switch(parseInt(type)) {
        case 1: return 'type-private';
        case 2: return 'type-vip';
        default: return 'type-normal';
    }
}

// 每隔一段时间校准一次
setInterval(requestTimeSync, 60000); // 每60秒校准一次

// 定期更新聊天室列表(30秒)
setInterval(updateRoomsList, 30000);
// 定期更新元宝余额(30秒)
setInterval(updateYuanbaoBalance, 30000);

// 定期检查socket连接的ip地址是否发生变化,如果网络已经断开链接发生变化则刷新页面
setInterval(function() {
    if (!currentUserSetting.is_logged) {
        return;
    }
    fetch(`/get_socket_balance_ip/${currentRoomId}`)
    .then(response => response.json())
    .then(data => {
        //console.log('on update_socket_balance_ip', data);
        
        if (socket_balance_ip !== data.ip) {    
            socket_balance_ip = data.ip;
            console.log('update_socket_balance_ip change to', socket_balance_ip);
            // 通知socket重新连接            
                        
            if (!socket.connected) {
                console.log('当前socket连接的ip地址发生了变化，页面刷新');
                window.location.reload();
            }
                       
        }
    });

}, 5000);  // 5秒检查一次

// 添加消息计数和限制
let messageCount = {};
let messageContent = {};
const MESSAGE_LIMIT_PER_MINUTE = 45;  // 限制一分钟发送消息次数
const DUPLICATE_MESSAGE_LIMIT = 3;  // 限制一分钟重复消息次数

// 用户管理功能
let selectedUsername = null;
let selectedUid = null;

// 发送消息前检查限制
function checkMessageLimits(message) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const username = currentUsername;
    // 初始化用户的消息计数
    if (!messageCount[username]) {
        messageCount[username] = [];
    }
    if (!messageContent[username]) {
        messageContent[username] = {};
    }
    
    // 清理旧的消息记录
    messageCount[username] = messageCount[username].filter(time => time > oneMinuteAgo);
    
    // 检查消息频率
    if (messageCount[username].length >= MESSAGE_LIMIT_PER_MINUTE) {
        alert('发送消息太频繁，请稍后再试');
        return false;
    }
    
    // 检查重复消息
    if (!messageContent[username][message]) {
        messageContent[username][message] = 0;
    }
    messageContent[username][message]++;
    
    if (messageContent[username][message] > DUPLICATE_MESSAGE_LIMIT) {
        alert('请不要重复发送相同的消息');
        return false;
    }
    
    // 记录本次消息
    messageCount[username].push(now);
    return true;
}

socket.on('force_logout', function(data) {
    alert(data.message);
    socket.disconnect();
    window.location.href = '/logout?room=' + currentRoomId;
});

socket.on('force_reload', function(data) {
    const serverVersion = data.version;    
    console.log('force_reload: currentVersion:', currentVersion, 'serverVersion:', serverVersion);
    
    let timeSeconds = Math.floor(Math.random() * 5) + 1;  // 随机等待1-5秒
    setTimeout(function() {
        window.location.reload();
    }, timeSeconds * 1000);
    

});

// 添加处理系统消息的函数
socket.on('system_message', function(data) {
    const username = currentUsername;
    if (data.type === 'ban' && data.username === username) {
        // 如果是被封禁消息且是针对当前用户
        const banUntil = data.ban_until ? new Date(data.ban_until) : null;
        localStorage.setItem('ban_until', data.ban_until);
        
        // 显示封禁息
        alert(`您已被管理员限制登录${data.duration < 0 ? '（永久）' : '到 ' + new Date(data.ban_until).toLocaleString()}`);
        
        // 断开连接并退出
        socket.disconnect();
        window.location.href = '/logout?room=' + currentRoomId;
    }    
    
    // 显示系统消息
    sysmessage = data.message;
    displaySystemMessage(sysmessage);

    if (data.type === 'info' && data.message.includes('元宝')) {
        // 解析消息中的元宝数量
        const match = data.message.match(/(\S+) 接收到了 (\d+)\s*个元宝/);
        if (match) {
            const to_username = match[1];
            const amount = parseInt(match[2]);     
            console.log('接收到了元宝数量：' + amount);
            playYuanbaoAnimation(amount);      
            
            if (currentUsername == to_username) {
                showYuanbaoNotification(data.message);
            }
        }

        const match2 = data.message.match(/发送(\d+)\s*个元宝/);
        if (match2) {
            const amount = parseInt(match2[1]);     
            console.log('发送了元宝数量：' + amount);                        
            showYuanbaoNotification(data.message);
        }
    }
});

// 表情数据
const emojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
    '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
    '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
    '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
    '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
    '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡'
];

// 初始化表情面板
function initEmojiPanel() {
    const emojiGrid = $('#emoji-grid');
    
    // 默认显示emoji表情
    showEmojis(emojis);
    
    // 切换表情类
    $('.emoji-tab').click(function() {
        $('.emoji-tab').removeClass('active');
        $(this).addClass('active');
        
        const type = $(this).data('type');
        if (type === 'emoji') {
            showEmojis(emojis);
        } else {
            //showEmojis(kaomoji);
        }
    });
}

// 显示表情
function showEmojis(list) {
    const emojiGrid = $('#emoji-grid');
    emojiGrid.empty();
    
    list.forEach(emoji => {
        const item = $('<div>')
            .addClass('emoji-item')
            .text(emoji)
            .click(() => insertEmoji(emoji));
        emojiGrid.append(item);
    });
}

// 插入表情到输入框
function insertEmoji(emoji) {
    const input = $('#chat-input');
    const pos = input[0].selectionStart;
    const text = input.val();
    const newText = text.slice(0, pos) + emoji + text.slice(pos);
    input.val(newText);
    input.focus();
    input[0].selectionStart = input[0].selectionEnd = pos + emoji.length;
}

// 点击表情按钮显示/隐藏表情面板
$('#btn_face').click(function(e) {
    e.stopPropagation();
    const panel = $('#emoji-panel');
    panel.toggle();
});

// 点击其他地方关闭表情面板
$(document).click(function(e) {
    if (!$(e.target).closest('#emoji-panel, #btn_face').length) {
        $('#emoji-panel').hide();
    }
});



// 修改消息显示函数
function displayMessage(msg) {
    const username = currentUsername;
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    if (msg.user.username === username) {
        messageDiv.classList.add('own-message');
    }
    
    // 创建用户信息区域
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    
    const avatar = document.createElement('img');
    avatar.src = `/statics/avatars/${msg.user.avatar}`;
    avatar.className = 'avatar';
    userInfo.appendChild(avatar);
    
    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'username';
    usernameSpan.style.color = msg.user.color || '#000';
    usernameSpan.textContent = msg.user.username;
    userInfo.appendChild(usernameSpan);
    
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date(msg.timestamp).toLocaleTimeString();
    userInfo.appendChild(timestamp);
    
    messageDiv.appendChild(userInfo);
    
    // 添加消息内容
    const content = document.createElement('div');
    content.className = 'content';
    if (msg.is_filtered) {
        content.classList.add('filtered-message');
    }
    content.textContent = msg.message;
    messageDiv.appendChild(content);    
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}


// 添加全局变
// 默认关闭提示音
let soundEnabled = localStorage.getItem('chatSoundEnabled') !== 'false';
//移动端默认关闭音效
if (navigator.userAgent.match(/iPhone|iPad|Android/i)) {
    soundEnabled = false;
    console.log('移动端默认关闭音效');
}

let originalTitle = document.title;
let titleInterval = null;
let isWindowFocused = true;



// 音效按钮点击处理
$('#btn_sound').click(function() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('chatSoundEnabled', soundEnabled);
    updateSoundButtonState();
});

// 更新音效按钮状态
function updateSoundButtonState() {
    const $btn = $('#btn_sound');
    if (soundEnabled) {
        $btn.removeClass('muted');
        $btn.attr('title', '关闭提示音');
        $('#sound-status').text('音效开启');
    } else {
        $btn.addClass('muted');
        $btn.attr('title', '开启提示音');
        $('#sound-status').text('音效关闭');
    }
}

// 播放消息提示音
function playMessageSound() {
    if (soundEnabled) {
        const audio = document.getElementById('messageSound');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => {
                //console.log('Audio play failed:', e);
            });
        }
    }
}

// 开标闪烁
function startTitleFlash() {
    if (!isWindowFocused && !titleInterval) {
        let isOriginal = true;
        titleInterval = setInterval(() => {
            document.title = isOriginal ? '【新消息】' + originalTitle : originalTitle;
            isOriginal = !isOriginal;
        }, 1000);
    }
}

// 停止标题闪烁
function stopTitleFlash() {
    if (titleInterval) {
        clearInterval(titleInterval);
        titleInterval = null;
        document.title = originalTitle;
    }
}

// 用户活跃度相关变量
let onlineSeconds = 0;
let activityLevel = 0;
let isTracking = true;
var lastMessageTime = Date.now();
let startHour = 8;  // default is 8:00 am
let endHour = 24;
var server_active_minutes = 0;
let minutes_per_level = 10;
let interval_fetch_active_info = 1000 * 60 * 1; // 1分钟获取一次活跃度信息

// 初始化函数
function initActivityTracker() {
    // 检查是否在有效时间范围内（8:00-24:00）
    function isValidTimeRange() {
        const now = new Date();
        const hours = now.getHours();
        return hours >= startHour && hours < endHour;
    }

    // 格式化时间
    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // 更新显示
    function updateDisplay() {
        if (!isValidTimeRange()) {
            //return;  //不限制时间，全天都可以活跃
        }      
        if (!currentUserSetting.is_logged) {
            return;
        }
       
        if (isTracking) {
            toggleTrackingTips(false);
            onlineSeconds++;
            // 1、更新计时器
            
            if (document.getElementById('online-time')) {
                document.getElementById('online-time').textContent = formatTime(onlineSeconds);  // 正常计时
            }
            
            // 2、更新等级（每10分钟升一级）
            const step = minutes_per_level * 60;
            const newLevel = Math.floor(onlineSeconds / step) + 1;            
            if (newLevel !== activityLevel) {
                console.log('newLevel:', newLevel);
                activityLevel = newLevel;

                currentActivityLevel = activityLevel;
                // 使用 const 而不是 var
                let activeMinutes = Math.floor(onlineSeconds / 60);
                let add_minutes = activeMinutes - server_active_minutes;
                server_active_minutes = activeMinutes;
                
                console.log('Updating active info:', {
                    activityLevel,
                    activeMinutes,
                    onlineSeconds
                });                                                
                if (document.getElementById('activity-level')) {
                    document.getElementById('activity-level').textContent = `LV.${activityLevel}`;
                }
            }
        } 

        
        //toggleTrackingTips(true);  //just for debug

        // 从0开始每10分钟，比如10分钟，20分钟，计时器会停止，需要发送消息后激活。如果最后5分钟有消息发送，则不停止计时器        
        if ((onlineSeconds+5) % (minutes_per_level * 60) === 0) {
            if ((Date.now() - lastMessageTime) >  5 * 60 * 1000) {  
                isTracking = false;
                toggleTrackingTips(true);
            }
        }
                
    }

    function updateActiveInfo() {
        if (!isTracking) {   // 如果用户不活跃，则不更新服务器活跃度信息
            return;
        }
        if (!currentUserSetting.is_logged) {  // 如果用户未登录，则不更新服务器活跃度信息
            return;
        }
        // 更新服务器level和minutes
        fetch('/user/active-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({                        
                add_minutes: 1
            })
        })
        .then(response => response.json())
        .then(data => {
            //console.log('更新活跃响应:', data);
            if (data.status === 'error') {
                console.error('更新活跃度失败:', data.message);
            } else {
                console.log('活跃度更新成功');
            }
        })
        .catch(error => {
            console.error('请求失败:', error);
        });
    }
    setInterval(updateActiveInfo, interval_fetch_active_info);  // 1分钟提交一次活跃度信息
    

    function toggleTrackingTips(show) {        
        try {
            const $tips = $('#trackingTips');
            if (show) {
                if ($tips.length > 0) {
                    return;
                }
                const welcome_text = getWelcomeText();
                const tips = $(`
                    <div id="trackingTips" class="tracking-tips">
                        说句话激活摸鱼计时器.<span class="tracking-tips-button" onclick="sendDirectMessage('${welcome_text}')">问候大家</span>
                    </div>
                `);
                $('#app').append(tips);
            } else {
                $tips[0] && $tips[0].remove();
            }
        } catch (e) {
            console.error('toggleTrackingTips error:', e);
        }
    }

    // 每秒更新次
    setInterval(updateDisplay, 1000);


    // 在午夜置计时器
    function checkReset() {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            onlineSeconds = 0;
            activityLevel = 1;
            document.getElementById('online-time').textContent = '00:00:00';
            document.getElementById('activity-level').textContent = 'LV.1';
        }
    }
    setInterval(checkReset, 60000); // 每分钟检查一次

    function getActiveInfo() {
        // 从服务器获取活跃天数
        fetch('/user/active-info')
            .then(response => response.json())
            .then(data => {
                //console.log('获取活跃度信息:', data);
                if (data.status === 'error') {
                    console.error('获取活跃度信息失败:', data.message);
                    return;
                }                            
                active_days = data.active_days;
                currentActiveDays = active_days;
                server_active_minutes = data.active_minutes;
                onlineSeconds = data.active_minutes * 60;
                //activityLevel = data.active_minutes / minutes_per_level + 1;
                if (document.getElementById('active-days')) {
                    document.getElementById('active-days').textContent = active_days;
                }
                
            });
    }
    getActiveInfo();
}



// 添加用户头像hover的事件处理
$(document).on('mouseenter', '.avator-img', function() {
    try {
        if (currentRoomSetting.zero_chat) {
            return;
        }
        const $float_user_info = $('#float_user_info');
        if ($float_user_info.length > 0) {
            return;
        }
        var userCtn = $(this).parent();
        var positionInfo = $(this).find('img')[0].getBoundingClientRect();
        //console.log('positionInfo:', positionInfo);
        var username = userCtn.data("username");
        //console.log('user', decodeURIComponent(userCtn.data("user")), );
        var user = JSON.parse(decodeURIComponent(userCtn.data("user")));
        
        if (user) {
            let width = 195;
            if (isRoomAdmin) {
                width = 454;
            }
            var isRight = (positionInfo.left + width > window.innerWidth) && !isMobile();
            if (userCtn.hasClass("right")) {
                isRight = true;
            }
            var active_level = Math.floor(user.active_minutes / minutes_per_level) + 1;
            var style = `top: ${positionInfo.top + positionInfo.height - 10}px; left: ${positionInfo.left + positionInfo.width / 2 - 14}px;`;
            //console.log('left', positionInfo.left + width, window.innerWidth);
            if (isRight) {
                style = `top: ${positionInfo.top + positionInfo.height - 10}px; right: ${window.innerWidth - positionInfo.left - positionInfo.width / 2 - 14}px;`;
            }
            var user_days = user.active_days ? user.active_days : user.days;
            if (isNaN(user_days)) {
                user_days = 0;
            }
            var create_date = user.create_date;   
            if (create_date) {
                create_date = new Date(create_date).toLocaleDateString();
            }                     
            
            var content = `<div id="float_user_info" class="float-user-info ${isRight ? 'right' : ''}" style="${style}">
                <div class="info-ctn">
                    <img class="user-img" src="/statics/avatars/${user.avatar}" alt="用户头像">
                    <div class="user-text-info">
                        <div class="user-name-ctn">
                            <h4 class="user-name">${user.username}</h4>
                            <img class="gender" src="${user.gender == 1 ? "https://gw.alicdn.com/imgextra/i1/O1CN01U1ZDgy1kb6v6uk8KO_!!6000000004701-2-tps-32-32.png" : "https://gw.alicdn.com/imgextra/i2/O1CN01jX9xQo1oMguj8YvXC_!!6000000005211-2-tps-32-32.png"}" style="width: 16px; height: 16px;"/>
                            ${user.active_level ? `<div class="user-level">LV.${user.active_level}</div>` : ''}
                        </div>
                        <div class="user-desc">${create_date ? `${create_date}加入，` : ''}累计在线${user_days}天</div>
                    </div>
                </div>
                <div class="action-ctn" data-username="${user.username}" data-uid="${user.uid}">
                    <div class="atbtn btn">@TA</div>
                    <div class="privatebtn btn">发私信</div>                    
                    <div class="custom-select">
                        <div class="selected-option">赠元宝</div>
                        <div class="dropdown-content" data-action="yuanbao" data-username="${user.username}" data-uid="${user.uid}">
                            <div class="option" data-value="1">1个元宝</div>
                            <div class="option" data-value="2">2个元宝</div>
                            <div class="option" data-value="3">3个元宝</div>
                            <div class="option" data-value="4">4个元宝</div>
                            <div class="option" data-value="5">5个元宝</div>
                        </div>
                    </div>
                    ${isRoomAdmin ? `
                    <div class="custom-select warn">
                        <div class="selected-option">禁言</div>
                        <div class="dropdown-content" data-action="jinyan" data-username="${user.username}" data-uid="${user.uid}">
                            <div class="option" data-value="300">5分钟</div>
                            <div class="option" data-value="3600">1小时</div>
                            <div class="option" data-value="86400">24小时</div>
                            <div class="option" data-value="604800">7天</div>
                            <div class="option" data-value="-1">永久</div>
                        </div>
                    </div>
                    <div class="custom-select warn">
                        <div class="selected-option">限登</div>
                        <div class="dropdown-content" data-action="xiandeng" data-username="${user.username}" data-uid="${user.uid}">
                            <div class="option" data-value="3600">1小时</div>
                            <div class="option" data-value="86400">24小时</div>
                            <div class="option" data-value="604800">7天</div>
                            <div class="option" data-value="-1">永久</div>
                        </div>
                    </div>
                    <div class="custom-select warn">
                        <div class="selected-option">身份</div>
                        <div class="dropdown-content" data-action="set-user-tag" data-username="${user.username}" data-uid="${user.uid}">
                            <div class="option" data-value="1">普通用户</div>
                            <div class="option" data-value="4">见习生</div>
                            <div class="option" data-value="5">室友</div>
                            <div class="option" data-value="6">棋友</div>
                            <div class="option" data-value="8">室长秘书</div>
                            <div class="option" data-value="9">副室长</div>
                            ${isSuperAdmin ? `                                                               
                                <div class="option" data-value="10">室长</div>                                
                            ` : ''}
                        </div>
                    </div>
                    <div class="btn warn">删信息</div>                    
                    ` : ''}
                </div>
            </div>`;
            $(this).append(content);
        }
    } catch (e) {
        console.log('e:', e);
    }
});

$(document).on('mouseleave', '.avator-img', function() {
    try {
        $('#float_user_info').remove();
    } catch (e) {
        console.log('error:', e);
    }
});

$(document).on('mouseenter', '.custom-select', function() {
    try {
        var dropdown = $(this).find('.dropdown-content');
        dropdown.css('display', 'block');
        const dropdownRect = dropdown[0].getBoundingClientRect();
        const dropdownBottom = $(this)[0].getBoundingClientRect().bottom + dropdownRect.height;
        if (dropdownBottom > window.innerHeight) {
            dropdown.css('top', 'auto');
            dropdown.css('bottom', '40px');
        } else {
            dropdown.css('top', '40px');
            dropdown.css('bottom', 'auto');
        }
    } catch (e) {
        console.log('error:', e);
    }
});
$(document).on('mouseleave', '.custom-select', function() {
    try {
        var dropdown = $(this).find('.dropdown-content');
        dropdown.css('display', 'none');
    } catch (e) {
        console.log('error:', e);
    }
});

$(document).on('click', '.action-ctn .atbtn', function() {
    try {
        $('#float_user_info').remove();
        const selectedUsername = $(this).parent().data('username');        
        onClickUsername(selectedUsername);
    } catch (e) {
        console.log('error:', e);
    }
});

$(document).on('click', '.action-ctn .privatebtn', function() {
    try {
        $('#float_user_info').remove();
        var btnText = $(this).text();
        const selectedUsername = $(this).parent().data('username');
        const selectedUid = $(this).parent().data('uid');
        if (btnText === '发私信') {
            console.log('发私信');
            if (selectedUsername !== currentUsername) {
                openPrivateChat(selectedUsername, selectedUid);
            }
        } else if (btnText === '删除消息') {
            if (selectedUsername) {
                showConfirm(`确认要删除"${selectedUsername}"的消息吗？`, function() {
                    console.log('删除消息');
                    socket.emit('room_admin_action', {
                        action: 'delete_messages',
                        username: selectedUsername,
                        uid: selectedUid,
                        room: currentRoomId
                    });
                    // 在前端移除该用户的所有消息
                    $(`.message:has(.message-username strong:contains('${selectedUsername}'))`).remove();
                });
            }
        } 
    } catch (e) {
        console.log('error:', e);
    }
})

$(document).on('click', '.action-ctn .option', function() {
    try {
        $('#float_user_info').remove();
        var value = $(this).data('value') - 0;
        var optionText = $(this).text();
        const selectedUsername = $(this).parent().data('username');
        const selectedUid = $(this).parent().data('uid');
        const action = $(this).parent().data('action');
        console.log('value, selectedUsername, action', value, selectedUsername, action);
        if (action === 'jinyan') {
            showConfirm(`确定要禁言"${selectedUsername}"${optionText}吗？`, function() {
                console.log('禁言');
                socket.emit('room_admin_action', {
                    action: 'mute_user',
                    username: selectedUsername,
                    uid: selectedUid,
                    duration: value,
                    room: currentRoomId
                });
            });
        } else if (action === 'xiandeng') {
            showConfirm(`确定要限制"${selectedUsername}"登录${optionText}吗？`, function() {
                console.log('限登');
                socket.emit('room_admin_action', {
                    action: 'ban_user',
                    username: selectedUsername,
                    uid: selectedUid,
                    duration: value,
                    room: currentRoomId
                });
            })
        } else if (action === 'yuanbao') {
            
            sendYuanbao(selectedUsername, value);
        } else if (action === 'set-user-tag') {
            showConfirm(`确定要设置"${selectedUsername}"的身份为${optionText}吗？`, function() {
                socket.emit('room_admin_action', {
                    action: 'set_user_tag',
                    username: selectedUsername,
                    uid: selectedUid,
                    tag: value,
                    room: currentRoomId
                });
            });
        }
    } catch (e) {
        console.log('error:', e);
    }
})

// 添加 socket.id 监控相关变量
let lastSocketId = null;

// 在 socket 连接成功后保存初始 socket.id
socket.on('connect', function() {
    console.log('Connected to socket server');
    if (!lastSocketId) {
        lastSocketId = socket.id;
        //console.log('Initial socket ID:', lastSocketId);
    } else if (lastSocketId !== socket.id) {
        //console.log('Socket ID changed:', lastSocketId, '->', socket.id);
    
        // 重新加入房间        
        socket.emit('join', {room_id: currentRoomId});
        lastSocketId = socket.id;
    }

    // 在 socket 连接成功时启动心跳
    console.log('socket connect...');
    startHeartbeat();
    updateSocketStatus('connected');

    requestTimeSync();

    // 初始化游戏事件
    initGameEvents();
});


// 修改断开连接的处理
socket.on('disconnect', function() {

    // 在断开连接时清理心跳
    clearInterval(heartbeatInterval);
    socket.connected = false;

    updateSocketStatus('disconnected');
    reconnectAttempts = 0; // 重置重连次数
});


socket.on('session_status', function(data) {
    if (!data.valid) {
        updateSocketStatus('session-error');
    }
});

function updateSocketStatus(status) {
    // const statusDot = document.getElementById('socket-status');
    const statusDots = document.getElementsByClassName('socket-status-dot');
    for (let i = 0; i < statusDots.length; i++) {
        var statusDot = statusDots[i];
        statusDot.className = 'socket-status-dot';
        switch(status) {
            case 'connected':
                statusDot.classList.add('connected');
                break;
            case 'disconnected':
                statusDot.classList.add('disconnected');
                break;
            case 'session-error':
                statusDot.classList.add('session-error');
                break;
        }
    }
}

// 初始化状态为断开
updateSocketStatus('disconnected');

// 点击socket图标，切换连接状态，打开关闭
$('#socket-status').click(function() {
    if (socket.connected) {
        socket.disconnect();
        
    } else {
        
        //socket.connect();
        reconnectSocket();
    }
});

// 添加心跳检测机制
let heartbeatInterval;
let missedHeartbeats = 0;
const MAX_MISSED_HEARTBEATS = 3;
const HEARTBEAT_INTERVAL = 30000;  // loop per 30 seconds

function startHeartbeat() {
    clearInterval(heartbeatInterval);
    missedHeartbeats = 0;
    
    heartbeatInterval = setInterval(() => {
        if (!socket.connected) {
            handleDisconnection();
            return;
        }
        
        console.log('发送心跳检测(' + socket_balance_ip + ')...');        
        socket.emit('heartbeat', {room_id: currentRoomId}, (response) => {
            if (response && response.status === 'ok') {
                missedHeartbeats = 0;
            } else {
                missedHeartbeats++;
                console.log('心跳检测失败:', missedHeartbeats);
                if (missedHeartbeats >= MAX_MISSED_HEARTBEATS) {
                    handleDisconnection();
                }
            }
        });
    }, HEARTBEAT_INTERVAL);
}


function handleDisconnection() {
    clearInterval(heartbeatInterval);
    socket.connected = false; // 强制更新连接状态
    
    console.log('handleDisconnection');
    // 显示重连提示
    displaySystemMessage('连接已断开，正在尝试重新连接...');
    
    // 尝试重新连接
    //socket = force_init();
    socket.connect();
    
}

// 在页面可见性改变时检查连接
document.addEventListener('visibilitychange', () => {
    
    if (document.visibilityState === 'hidden') {
        // 页面进入后台，启动更频繁的心跳检测
        clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
            if (!socket.connected) {
                handleDisconnection();
            }
        }, 2000); // 更频繁地检查
    } else {
        // 页面回到前台，恢复正常心跳频率
        startHeartbeat();
    }
});

// 添加模拟休眠断开的测试功能
let simulateSleepBtn = $('<button>')
    .text('模拟休眠')
    .addClass('btn btn-warning btn-sm')
    .css({
        'position': 'fixed',
        'bottom': '10px',
        'right': '10px',
        'z-index': 1000
    })
    .click(function() {
        simulateSleep();
    });

//$('body').append(simulateSleepBtn);

function simulateSleep() {
    console.log('模拟休眠开始...');
    
    // 保存当前连接状态
    const wasConnected = socket.connected;
    
    // 强制断开连接
    socket.disconnect();
    
    // 禁用自动重连
    socket.io.reconnection(false);
    
    // 模拟长时间休眠(30秒)
    setTimeout(() => {
        console.log('模拟休眠结束，尝试重新连接...');
        
        // 重新启用自动重连
        socket.io.reconnection(true);
        
        // 如果之前是连接状态，尝试重新连接
        if (wasConnected) {
            reconnectSocket().then(() => {
                console.log('重连成功');
                displaySystemMessage('重连成功');
            }).catch(error => {
                console.error('重连失败:', error);
                //displaySystemMessage('重连失败，请刷新页面重试');
            });
        }
    }, 30000);
    
    displaySystemMessage('模拟休眠中，30秒后尝试重连...');
}


function closeTopicBar() {
    $('#chat-topic-bar').hide();
    $('#right_panel').hide();
    if (isMobile()) {
        $(".items-thumbnail").css("display", "flex");
    }
}

function showTopicContent(tag) {
    //提取标签
    const chatTopicBar = $('#chat-topic-bar');
    chatTopicBar.show();
    chatTopicBar.empty();
    
    //增加标题和内容
    chatTopicBar.prepend(`<div class="topic-title" onclick="inputPreview('${tag} ')"><b>${tag}</b> <span class="btn btn-chat" onclick="inputPreview('${tag} ')">参与讨论</span> <span class="btn btn-close" onclick="closeTopicBar()"></span></div><div class="topic-content"></div>`);
    //增加标题
    const topicContent = $('.topic-content');
    

    // 获取特定topic的所有历史聊天记录
    let tag_keyword = `${tag}`;
    tag_keyword = tag_keyword.replace('#', '');
    $.get('/get_topic_messages', {room_id: 'all', topic: tag_keyword, limit: 100}, function(data) {
        
        
        for (let message of data.messages) {
            // 将包含该标签的历史消息显示在侧边栏
            const nickname = message.user.username;
            const user_color = message.user.color;
            let messagetext = message.message;
            const messageimage = message.image;
            const message_id = message.message_id;
            const room_name = message.room_name;
            const user_role = message.user.roomrole;
            // 如果包含#，则过滤掉#后面的标签 
            let messagetext_to_filter = messagetext.replace(new RegExp(`${tag}`, 'g'), '');        
            // 过滤 [ ]
            messagetext_to_filter = messagetext_to_filter.replace(/\[.*?\]/g, '');
            const messagetime = new Date(message.timestamp).toLocaleTimeString(); // 2025-01-27 10:00:00
            const messageHtml = `
                <div class="message">                                                                
                    <div class="message-header"><span class="message-username" style="color: #070707;">${nickname}</span>                                               
                        <span class="message-room"><a href="/chat/${message.room_id}">#${message.room_name}</a></span>
                        <span class="timestamp">${messagetime}</span>
                        
                        </div>
                        <div class="message-body">
                            <div class="message-content">${messagetext_to_filter}</div>
                            ${messageimage ? `<div class="message-image"><img src="${messageimage}" class="chat-image" /></div><span class="message-like-count" data-message-id="${message_id}" data-like-count="0" onclick="likeMessage('${message_id}', '${messageimage}','')"> </span>` : ''}
                        </div>
                </div>
            `;
            if (messagetext_to_filter.trim()!='') {
                
                topicContent.prepend(messageHtml); // 将新消息添加到最前面
            }
        }
    
    });
            
}


// 在聊天加强右边栏中显示更多的内容
$(document).on('click', '.topic-tag', function() {
    console.log('message-topic-tag clicked');
    if ($(this).parent().hasClass('topic-tag-group') && isMobile()) { // 如果是移动端，则不显示话题栏
        return;
    }

    const tag = $(this).text();
    showTopicContent(tag);
    

});

// 添加点击图片放大
$(document).on('click', '.chat-image', function(e) {
    try {
        let imgDom = e.currentTarget;
        let view = `
            <div class="img-modal">
                <div class="img-bg"></div>
                <div class="img-content">
                    ${imgDom.outerHTML}
                </div>                
                <img class="img-close" src="https://img.alicdn.com/imgextra/i3/O1CN01aLqGdL1qOdltZOh5F_!!6000000005486-2-tps-96-96.png" />
            </div>
        `
        let dom = $(view);
        $('body').append(dom);
        dom.on('click', function (e) {
            dom.remove();
        });
    } catch (e) {
        console.log('e:', e);
    }
});

// 将文字和图片发送到小窗消息
function addToWindow(msg_text, image_url) {
    console.log('addToWindow:', msg_text, image_url);
    if (!isRoomAdmin) {
        return;
    }
    // 将img-content的内容加入到小窗中
    let msgContentHtml = '';
    if (msg_text) {
        msgContentHtml += `<div class="message-text">${msg_text}</div>`;
    }
    if (image_url) {
        msgContentHtml += `<img src="${image_url}" class="chat-image">`;
    }
    const panel = $('.floating-panel');
    let content = panel.find('.panel-content');
    if (content.length) {
        socket.emit('update_server_room_settings', {
            msgtype: 'window',
            room: currentRoomId,
            message: msgContentHtml
        });       
    }    
}

// 点击通知按钮，切换通知栏的显示状态
$('#chat-header').click(() => { $('#chat-header').toggleClass('showNotify') })

//********************************** */
// 私信相关功能
let activeChat = null; // 存储当前活动的私信窗口
let activeChatUid = null; // 存储当前私聊的用户

// 初始化私信功能
function initializePrivateChat() {
    
    // 获取最近联系人
    socket.emit('get_recent_contacts');
    
    // 监听最近联系人更新
    socket.on('recent_contacts', function(data) {
        console.log('recent_contacts:', data);
        updateContactsList(data.contacts);
    });
    
    // 监听新私信
    socket.on('private_message', function(data) {    
        console.log('private_message:', data);
        
        handleNewPrivateMessage(data);
    });
    
    // 监听发送的私信确认
    socket.on('private_message_sent', function(data) {
        //console.log('private_message_sent:', data);
        handleNewPrivateMessage(data);
    });

    // 监听私信系统消息
    socket.on('private_system_message', function(data) {
        console.log('private_system_message');
        handleSystemMessage(data);
    });
    
    // 监听私信历史记录
    socket.on('private_history', function(data) {
        console.log('private_history:');
        displayPrivateHistory(data.messages);
    });
}

// 更新联系人列表
function updateContactsList(contacts) {
    if (user_private_chat_switch == '0') {
        console.log('私信功能已经关闭');
        return;
    }
    const contactsList = $('.private-chat-contacts');
    contactsList.empty();
    
    contacts.forEach(contact => {
        if (contact.username == currentUsername) {
            return;
        }
        const contactHtml = `
            <div class="contact-item ${contact.unread ? 'has-unread' : ''}" data-username="${contact.username}" data-uid="${contact.uid}">
                <img src="/statics/avatars/${contact.avatar}" class="avatar-small">
                <div class="contact-info">
                    <div class="contact-name-row">
                        <div class="contact-name">${contact.username}</div>
                        <span class="unread-badge"></span>
                    </div>
                    <div class="last-message">${contact.last_message}</div>
                </div>
                
            </div>
        `;
        contactsList.append(contactHtml);
        
    });
}

// 修改打开私信窗口的逻辑
function openPrivateChat(username, uid) {

    console.log('openPrivateChat:', username);    
    if (user_private_chat_switch == '0') {
        console.log('私信功能已经关闭');
        return;
    }
    
    // 如果已经打开了与该用户的私聊窗口
    if (activeChatUid === uid) {
        return;
    }

    // 如果有其他私聊窗口打开，先关闭它
    if (activeChat) {
        activeChat.remove();
        activeChat = null;
        activeChatUid = null;
    }

    // 清除用户列表中的未读标记
    const userListItem = $(`#user-${username}`);
    if (userListItem.length) {
        userListItem.find('.unread-badge').remove();
    }

    // 克隆窗口模板
    const chatWindow = $('#private-chat-template').clone()
        .removeAttr('id')
        .css('display', 'block');
    
    // 设置窗口标题
    chatWindow.find('.private-chat-title').text(username);    
    
    // 设置窗口位置
    if (isMobile()) {
        chatWindow.css({
            'right': '0',
            'z-index': 1000
        });
    } else {
        chatWindow.css({
            'right': '270px',
            'z-index': 1000
        });
    }
    
    // 添加到文档
    $('body').append(chatWindow);
    
    // 存储当前活动的私聊窗口和用户
    activeChat = chatWindow;
    activeChatUid = uid;
    
    // 清除未读标记
    $(`.contact-item[data-uid="${uid}"]`).removeClass('has-unread');
    
    // 获取历史消息
    socket.emit('get_private_history', {to_uid: uid});
    
    // 绑定事件处理
    bindPrivateChatEvents(username, uid, chatWindow);
}


// 绑定私信窗口事件
function bindPrivateChatEvents(username, uid, chatWindow) {
    // 关闭按钮
    chatWindow.find('.close-btn').click(() => {
        chatWindow.remove();
        activeChat = null;
        activeChatUid = null;
    });
    
    // 发送消息
    const input = chatWindow.find('.private-message-input');
    const sendBtn = chatWindow.find('.send-btn');
    
    function sendPrivateMessage() {
        const message = input.val().trim();
        if (message) {
            console.log('sendMessage:', message);
            console.log('username:', username);
            socket.emit('private_message', {
                to_user: username,
                to_uid: uid,
                room_id: currentRoomId,
                message: message
            });
            input.val('');
        }
    }
    
    //sendBtn.click(sendMessage);
    input.keypress(e => {
        if (e.which === 13) sendPrivateMessage();
    });
}

// 处理系统消息
function handleSystemMessage(data) {
    //console.log('handleSystemMessage:', data);
    const message = data.message;
    const messagesContainer = $('.private-chat-messages');
    const messageHtml = `<div class="system-message">${message}</div>`;
    messagesContainer.append(messageHtml);
    messagesContainer.scrollTop(messagesContainer[0].scrollHeight);
}

// 修改处理新私信的逻辑
function handleNewPrivateMessage(data) {
    const fromUser = data.from_user.username;
    const fromUid = data.from_user.uid;
    const toUser = data.to_user;
    const toUid = data.to_uid;
    const otherUser = fromUser === currentUsername ? toUser : fromUser;
    const otherUid = fromUid === currentUid ? toUid : fromUid;

    
    if (user_private_chat_switch == '0') {
        console.log('私信功能已经关闭, 不处理私信消息');
        return;
    }
       
    // 更新联系人列表中的最后消息
    const contactItem = $(`.contact-item[data-uid="${otherUid}"]`);
    if (contactItem.length) {
        
        contactItem.find('.last-message').text(data.message);

        // 如果窗口未打开，显示未读标记
        if (activeChatUid !== otherUid) {
            console.log('add unread badge: '+ otherUser);
            contactItem.addClass('has-unread');
            //contactItem.find('.contact-name').after('<span class="unread-badge"></span>');
            // 打开私信窗口
            openPrivateChat(otherUser, otherUid);
        }
    }
    else {
        console.log('no contact item: '+ otherUser);
        socket.emit('get_recent_contacts');
    }

    // 只有当已经打开了与该用户的私聊窗口时，才显示新消息
    if (activeChatUid === otherUid && activeChat) {
        const chatWindow = activeChat;
        const messagesContainer = chatWindow.find('.private-chat-messages');
        
        const messageHtml = `
            <div class="message ${fromUid === currentUid ? 'message-self' : ''}">
                <img src="/statics/avatars/${data.from_user.avatar}" class="avatar-small">
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-username" style="color: ${data.from_user.color}; font-weight: bold; margin-left: 5px;">${fromUser}</span>
                        <span class="message-time">${new Date(data.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div class="message-text">${data.message}</div>
                </div>
            </div>
        `;
        
        messagesContainer.append(messageHtml);
        messagesContainer.scrollTop(messagesContainer[0].scrollHeight);
        // 将输入框焦点放入到输入框
        chatWindow.find('.private-message-input').focus();
    }

    
    // 播放提示音和闪烁标题
    if (fromUser !== currentUsername) {
        playMessageSound();
        startTitleFlash();
    }
}


// 显示历史消息
function displayPrivateHistory(messages) {
    messages.forEach(handleNewPrivateMessage);
}

// 点击用户头像打开私信
// $(document).on('click', '.online-user-avatar', function() {
//     const username = $(this).data('username');
//     if (username !== currentUsername) {
//         openPrivateChat(username);
//     }
// });

// 点击联系人打开私信
$(document).on('click', '.contact-item', function() {
    const username = $(this).data('username');
    const uid = $(this).data('uid');
    if (uid !== currentUid) {
        openPrivateChat(username, uid);
    }
});



// 添加元宝掉落动画
function createYuanbao(yuanbaoIndex) {
    const yuanbao_uni_id = Math.random().toString(36).substring(2, 15);
    const yuanbao = document.createElement('div');
    yuanbao.className = 'yuanbao3d';
    yuanbao.style.backgroundImage = `url('/statics/icons/yuanbao-${yuanbaoIndex}.png')`;    
    yuanbao.style.left = (Math.random() * window.innerWidth / 2 + window.innerWidth / 4) + 'px';
    yuanbao.setAttribute('data-yuanbao-uni-id', yuanbao_uni_id);     
    document.body.appendChild(yuanbao);
    // 动画结束后移除元素
    yuanbao.addEventListener('animationend', () => {
        yuanbao.remove();
    });    

}

// 显示元宝通知
function showYuanbaoNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'yuanbao-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // 动画结束后移除通知
    notification.addEventListener('animationend', () => {
        notification.remove();
    });
}

// 播放元宝掉落效果
function playYuanbaoAnimation(amount) {
    // 创建多个元宝掉落
    
    for (let i = 0; i < amount; i++) {
        setTimeout(() => {
            let yuanbaoIndex = 0;
            if (amount == 1) {
                yuanbaoIndex = 0; //Math.floor(Math.random() * 4);
            }
            else {
                yuanbaoIndex = (i+1) % 4;
            }           
            createYuanbao(yuanbaoIndex);
        }, i * 300); // 每个元宝间隔100ms出现
    }
}



// 添加浮动面板的功能

function initFloatingPanel() {
    const panel = $('#floatingPanel');
    const header = panel.find('.panel-header');
    const content = panel.find('.panel-content');
    const saveBtn = panel.find('.save-btn');
    let originalContent = '';
    
    // 双击内容区域进入编辑模式
    content.on('dblclick', function(e) {
        if (!panel.hasClass('minimized')) {
            enterEditMode();
        }
    });

    // 进入编辑模式
    function enterEditMode() {
        originalContent = content.html();
        content.attr('contenteditable', 'true');
        content.addClass('editing');
        saveBtn.show();
    }

    // 退出编辑模式
    function exitEditMode(save = true) {
        content.attr('contenteditable', 'false');
        content.removeClass('editing');
        saveBtn.hide();

        if (!save) {
            content.html(originalContent);
            return;
        }

        // 保存更改
        const newContent = content.html();
        if (newContent !== originalContent) {
            socket.emit('update_server_room_settings', {
                msgtype: 'window',
                room: currentRoomId,
                message: newContent
            });
        }
    }

    // 保存按钮点击事件
    saveBtn.click(function() {
        exitEditMode(true);
    });

    // ESC键退出编辑模式
    content.on('keydown', function(e) {
        if (e.key === 'Escape') {
            exitEditMode(false);
        }
    });
    

    // 设置面板的初始位置（右下角）
    var bottom = $(".input-area").height();
    var right = $("#user-list").width();
    panel.css({
        right: `${right}px`,
        top: `100px`,
        transform: 'none'  // 确保初始状态没有transform
    });

    function setTranslate(xPos, yPos, el) {
        el.css('transform', `translate(${xPos}px, ${yPos}px)`);
    }

    panel.find('.admin-close-window').click(function() {
        // 给服务器发送消息 /window        
        socket.emit('update_server_room_settings', {
            msgtype: 'window',
            room: currentRoomId,
            message: ''
        });
    });

    // 最小化功能
    panel.find('.minimize-btn').click(function(e) {
        e.stopPropagation();  // 阻止事件冒泡
        panel.toggleClass('minimized');
        if (panel.hasClass('minimized')) {
            $(this).text('+');
            
            
            
            var bottom = $(".input-area").height();
            var right = $("#user-list").width();
            // 重置位置到右下角
            panel.css({
                transform: 'none',
                right: `${right}px`,
                top: `100px`,
                left: 'auto',
                
            });
        } else {
            $(this).text('-');
            
        }
    });

    // 点击最小化后的面板恢复
    panel.click(function(e) {
        if (panel.hasClass('minimized') && 
            !$(e.target).is('.close-btn') && 
            !$(e.target).is('.minimize-btn')) {
            panel.removeClass('minimized');
            panel.find('.minimize-btn').text('_');
            
        }
    });

    // 关闭功能
    panel.find('.close-btn').click(function() {
        panel.hide();
    });

    // 保存面板位置
    function savePanelPosition() {
        const position = {
            x: xOffset,
            y: yOffset
        };        
        localStorage.setItem('floatingPanelPosition', JSON.stringify(position));
    }

    // 恢复面板位置
    function loadPanelPosition() {
        const savedPosition = localStorage.getItem('floatingPanelPosition');
        if (savedPosition) {
            const position = JSON.parse(savedPosition);
            xOffset = position.x;
            yOffset = position.y;
            setTranslate(position.x, position.y, panel);
        }
    }

    // 页面加载时恢复位置
    loadPanelPosition();

    // 拖动结束时保存位置
    panel.on('dragend', savePanelPosition);

}

function showConfirm(title, confirm) {
    var popup = document.getElementById('custom_confirm_popup');
    if (popup) {
        popup.remove();
    }
    var content = `
        <div id="custom_confirm_popup">
            <div class="overlay"></div>
            <div class="custom-confirm-popup">
                <div class="popup-content">
                    <div class="popup-header">
                        <span class="popup-close" onclick="closePopup()">&times;</span>
                    </div>
                    <p class="popup-message">${title}</p>
                    <div class="popup-buttons">
                        <button class="cancel-button" onclick="closePopup()">取消</button>
                        <button class="confirm-button">确认</button>
                    </div>
                </div>
            </div>
        </div>
    `
    $('body').append(content);
    const confirmButton = $("#custom_confirm_popup .confirm-button");
    confirmButton.on("click", function() {
        confirm();
        closePopup();
    });
}
function closePopup() {
    $('#custom_confirm_popup').remove();
}

function isMobile() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isTouchSupported = 'ontouchstart' in window;
    const screenWidth = window.innerWidth;
    const maxMobileWidth = 768;

    return (
        /(iphone|ipad|ipod|android|blackberry|windows phone|iemobile|opera mini)/.test(userAgent) ||
        (isTouchSupported && screenWidth < maxMobileWidth)
    );
}



// 页面加载初始化
$(document).ready(function() {

    console.log('************页面加载初始化************');

    if (run_mode !== 'dev') {
        initLogin();
    }
    
    if (!currentUserSetting.is_logged) {    
        
        return;
    }

    updateRoomsList();  // 更新聊天室列表
    updateYuanbaoBalance();  // 更新元宝余额
    getTopActivityInfo(currentRoomId);  //打开活动面板
    checkMessageLength();  // 检查消息长度
    updateManagerPanel();  // 更新管理员面板

    initEmojiPanel(); // 初始化表情面板

    initializePrivateChat(); // 初始化私聊

    if (!currentRoomSetting.personal_chat) {
        initActivityTracker(); // 初始化活动追踪器
    }

    initFloatingPanel(); // 初始化浮动小窗面板

    initAIInputBar(); // 初始化AI输入栏

    // 设置音效按钮初始状态
    updateSoundButtonState();

    const current_search_result = localStorage.getItem('current_search_result');
    if (currentRoomSetting.zero_chat && current_search_result) {
        const search_result = JSON.parse(current_search_result);
        showSearchResultBar(search_result);
        if (isMobile()) {
            insertImgs(search_result);
            $(".items-thumbnail").css("display", "flex");
            $('#right_panel').hide();
        }
    }

    // 监听窗口焦点
    $(window).focus(function() {
        isWindowFocused = true;
        stopTitleFlash();
    }).blur(function() {
        isWindowFocused = false;
    });

    initZero();

    initUserSetting();

    
});


function insertImgs(search_result) {
    const imgCtn = $(".items-thumbnail").find(".items-thumbnail-imgs");
    imgCtn.empty();
    for (var i = 0, l = search_result.items.length < 3 ? search_result.items.length : 3; i < l; i++) {
        var imgUrl = '';
        if (search_result.items[i].whiteImg) {
            imgUrl = '//img.alicdn.com/' + search_result.items[i].whiteImg;
        } else {
            imgUrl = search_result.items[i].pic_path;
        }
        imgCtn.append(`<img src="${imgUrl}" />`);
    }
}

function updateButtonStatus() {
    // 如果是AI商品聊天室，修改按钮为停止
    if (currentRoomSetting.zero_chat) {  //极简AI对话风格
        if (window.isChatting) {
            $("#btn_send").hide();
            $(".btn-stop").css('display', 'flex');
        } else {
            $("#btn_send").show();
            $(".btn-stop").hide();
        }
        if ($('#chat-input').val() != '') {
            $('#btn_send').css('opacity', '1');
        } else {
            $('#btn_send').css('opacity', '0.2');
        }
    }
}

function clearRightPanel() {
    if (currentRoomSetting.zero_chat) {
        localStorage.removeItem('current_search_result');
        $("#right_panel").empty().hide();
    }
}

function toggleZeroChat(action) {
    if (currentRoomSetting.zero_chat && action == 'hide') {
        $('#messages').hide();
        $('#chat_intro').show();
    } else if (currentRoomSetting.zero_chat && action == 'show') {
        if ($('#messages .no-message')[0]) {
            $('#messages').empty();
        }
        $('#messages').show();
        $('#chat_intro').hide();
    }
}

// 极简版 初始化逻辑
function initZero() {
// 左侧交互
  $('.chat-left .left-expand').on('click', function () {
    
    $('.chat-left').toggleClass('hide')
  })
  $('.chat-left').on(
    'hover',
    function () {
      if ($('.chat-left').hasClass('hide')) {
        $('.chat-left').addClass('active')
      }
    },
    function () {
      if ($('.chat-left').hasClass('hide')) {
        $('.chat-left').removeClass('active')
      }
    }
  )




  $('.left-new, .chat-left-new').on('click', function () {
    workAIStreaming('clearhistory');

    localStorage.removeItem('current_search_result');
    toggleZeroChat('hide');
    $('.chat-title h1').empty();
    
    if (isMobile()) {
        $(".items-thumbnail").css("display", "none");
    }

  })

  // 输入框hover态
  $('#chat-input')
    .on('focus', function () {
      $('.chat-input-container').addClass('active')
    })
    .on('blur', function () {
      $('.chat-input-container').removeClass('active')
    })
  // 输入框自适应
  $('#chat-input').on('input', function () {
    $(this).css('height', 'auto')
    $(this).css('height', $(this)[0].scrollHeight + 'px')
    updateButtonStatus();
  })
  // 深度思考&商品搜索选择
  $('#ai-input-bar input[type="checkbox"]').on('change', function () {
    var checked = $(this).prop('checked')
    if (checked) {
      $(this).parents('.tag').addClass('active')
    } else {
      $(this).parents('.tag').removeClass('active')
    }
  })

  // 点击显示商品
  $(".items-thumbnail").on("click", function() {
    $(".items-thumbnail").css("display", "none");
    $('#right_panel').show();
  });

  const chat_list = localStorage.getItem('chat_list');
  console.log('chat_list:', chat_list);
  if (chat_list && chat_list != 'null') {
    try {
        const chats = JSON.parse(chat_list);
        chats.forEach((chat) => {
            $('.chat-left-list').append(`<div class="chat-left-item">${chat}</div>`)
        })
    } catch (error) {
        console.log('error:', error);
    }
  }

  // 在聊天界面添加游戏按钮
  function addGameButton() {
    const gameButton = $('<button>')
        .text('小游戏')
        .addClass('btn btn-sm btn-outline-primary')
        .css({
            'margin-left': '10px'
        })
        .click(function() {
            $('#chat-games-container').toggle();
        });
    
    // 添加到聊天控制区域
    $('.chat-control').append(gameButton);
  }
}

// 添加游戏事件监听
function initGameEvents() {
    if (typeof socket !== 'undefined') {
        // 游戏匹配响应
        socket.on('game_match_found', function(data) {
            console.log('找到对手:', data);
        });
        
        // 游戏开始事件
        socket.on('game_start', function(data) {
            console.log('游戏开始:', data);
        });
        
        // 游戏移动事件
        socket.on('game_move', function(data) {
            console.log('游戏动作:', data);
        });
        
        // 游戏结束事件
        socket.on('game_over', function(data) {
            console.log('游戏结束:', data);
        });
        
        // 玩家离开事件
        socket.on('game_player_left', function(data) {
            console.log('玩家离开:', data);
        });
    }
}

// 账号后台登录模块

function initLogin() {
    
    if (!window.lib.login.isLogin()) {
        console.log('未登录, iframe打开登录页');
        const loginDiv = document.createElement('div');
        loginDiv.id = 'login-container';
        const loginIframe = document.createElement('iframe');
        loginIframe.className = 'login-iframe';
        loginIframe.src = 'https://login.taobao.com/member/login.jhtml?style=mini&newMini2=true&from=sm&full_redirect=false';
        loginDiv.appendChild(loginIframe);
        document.body.appendChild(loginDiv);

        // 监听淘宝账号是否登录，淘宝账号登录完后，执行聊天室自动登录的逻辑
        let checkLoginInterval;
        loginIframe.onload = () => {
            if (checkLoginInterval) { clearInterval(checkLoginInterval); }
            checkLoginInterval = setInterval(() => {
                if (window.lib.login.isLogin()) {
                    clearInterval(checkLoginInterval);
                    document.body.removeChild(loginDiv);
                    doAutoLogin();
                }
            }, 100); // 每 100ms 检查一次
        };
    } else {
        doAutoLogin();
    }
}

// 封装获取URL参数的函数
function getUrlParams() {
    const queryString = window.location.search.substring(1);
    const params = {};
    const queryParams = queryString.split('&');
    for (let i = 0; i < queryParams.length; i++) {
        const pair = queryParams[i].split('=');
        if (pair.length === 2) {
            params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        }
    }
    return params;
}

// 淘宝账号登录状态下，聊天室的自动登录逻辑
function doAutoLogin() {
    if (!currentUserSetting.uid) {
        try {
            window.lib.mtop.request({
                api: 'mtop.taobao.pc.bbs.chatroom.getLoginMsg',
                v: '1.0',
                ecode: 1,
                needLogin: false,
                timeout: 5000,
                data: {}
            }).then(function (resJson) {
                // 成功回调
                if (resJson.data && resJson.data.result) {
                    const result = JSON.parse(resJson.data.result);

                    // 从URL中获取refcode和passcode
                    const params = getUrlParams();
                    const refcode = params['refcode'] || '';
                    const passcode = params['passcode'] || '';

                    console.log('refcode:', refcode);
                    console.log('passcode:', passcode);
    
                    // 创建一个form元素
                    const form = document.createElement('form');
                    form.method = 'POST'; // 提交方式为POST
                    form.action = `/login/${currentRoomId}`; // 替换为目标提交地址
    
                    const nickInput = document.createElement('input');
                    nickInput.type = 'hidden'; // 隐藏字段
                    nickInput.name = 'username';
                    try {
                        const last_username = octalToChinese(getCookie('last_username'));
                        nickInput.value = last_username ? last_username : decodeURIComponent(result.SNSName);
                    } catch {
                        nickInput.value = decodeURIComponent(result.SNSName);
                    }
                    form.appendChild(nickInput);
    
                    const genderInput = document.createElement('input');
                    genderInput.type = 'hidden';
                    genderInput.name = 'gender';
                    const last_gender = getCookie('last_gender');
                    genderInput.value = last_gender ? last_gender : '1';
                    form.appendChild(genderInput);
    
                    const avatarInput = document.createElement('input');
                    avatarInput.type = 'hidden';
                    avatarInput.name = 'avatar';
                    const last_avatar = getCookie('last_avatar');
                    avatarInput.value = last_avatar ? last_avatar : '';
                    form.appendChild(avatarInput);
    
                    const roomIdInput = document.createElement('input');
                    roomIdInput.type = 'hidden';
                    roomIdInput.name = 'room_id';
                    roomIdInput.value = currentRoomId;
                    form.appendChild(roomIdInput);
    
                    const tbnickInput = document.createElement('input');
                    tbnickInput.type = 'hidden';
                    tbnickInput.name = 'tbnick';
                    tbnickInput.value = decodeURIComponent(result.SNSName);
                    form.appendChild(tbnickInput);
    
                    const tbidtokenInput = document.createElement('input');
                    tbidtokenInput.type = 'hidden';
                    tbidtokenInput.name = 'tbidtoken';
                    tbidtokenInput.value = result.tbidtoken;
                    form.appendChild(tbidtokenInput);
    
                    const tbidtokenHashInput = document.createElement('input');
                    tbidtokenHashInput.type = 'hidden';
                    tbidtokenHashInput.name = 'tbidtoken_hash';
                    tbidtokenHashInput.value = result.tbidtoken_hash;
                    form.appendChild(tbidtokenHashInput);

                    const refcodeInput = document.createElement('input');
                    refcodeInput.type = 'hidden';
                    refcodeInput.name = 'refcode';
                    refcodeInput.value = refcode;
                    form.appendChild(refcodeInput);

                    const passcodeInput = document.createElement('input');
                    passcodeInput.type = 'hidden';
                    passcodeInput.name = 'passcode';
                    passcodeInput.value = passcode;
                    form.appendChild(passcodeInput);
    
                    // 将表单添加到body中（需要插入到DOM中才能提交）
                    document.body.appendChild(form);
    
                    // 提交表单
                    form.submit();
                }
            }).catch(function (res) {
                console.log('mtop请求失败', res);
            });
        } catch (err) {
            console.error('auto login error:', err);
        }
    }
}

/**
 * 获取cookie
 * @param {*} key 
 * @returns 
 */
function getCookie(key) {
    // 使用正则表达式匹配指定 key 的 Cookie 值
    const cookiePattern = new RegExp(`(^|;)\\s*${key}\\s*=\\s*([^;]+)`);
    const match = document.cookie.match(cookiePattern);
    return match ? decodeURIComponent(match[2]) : null;
}

/**
 * cookie中的last_name为八进制编码，需要转换为中文
 * 将八进制编码的字符串转换为中文，例如 \345 转换为 男，
 * @param {*} octalStr 
 * @returns 
 */
function octalToChinese(octalStr) {
    // 匹配所有八进制编码（形如 \345）
    const matches = octalStr.match(/\\(\d{3})/g);
    if (!matches) return ""; // 如果没有匹配到任何编码，返回空字符串

    // 将八进制编码转换为字节数组
    const bytes = matches.map(octal => parseInt(octal.slice(1), 8));

    // 使用 TextDecoder 将字节数组解码为 UTF-8 字符串
    const uint8Array = new Uint8Array(bytes);
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(uint8Array);
}

function initUserSetting() {
    // 添加选择头像的逻辑
    $('#avatar_container').on('click', '.avatar-option', function() {
        $('.avatar-option').removeClass('selected');
        $(this).addClass('selected');
        $('#avatar').val($(this).data('avatar'));
    });
    // 切换头像列表
    $('#avatar_type_list').on('click', '.avatar-type', function() {
        const avatar_type = $(this).data('avatar-type');
        console.log(avatar_type);
        $('.avatar-type').removeClass('selected');
        $(this).addClass('selected');
        $('#avatar_container').html('');
        if (avatar_type) {
            insertAvatar(avatar_type);
        } else {
            for (const avatar_type in avatar_list) {
                insertAvatar(avatar_type);
            }
        }
    })
}


// 插入对应类型的头像列表
function insertAvatar(avatar_type) {
    const avatar_container = document.getElementById('avatar_container');
    const avatar_list_item = document.createElement('div');
    avatar_list_item.className = 'avatar-list-item';
    for (var i = 0, l = avatar_list[avatar_type].length; i < l; i++) {
        const avatar_item = document.createElement('div');
        avatar_item.className = 'avatar-option';
        avatar_item.setAttribute('data-avatar', avatar_list[avatar_type][i]);
        avatar_item.innerHTML = '<img src="/statics/avatars/' + avatar_list[avatar_type][i] + '" alt="' + avatar_list[avatar_type][i] + '">';
        avatar_list_item.appendChild(avatar_item);
    }
    avatar_container.appendChild(avatar_list_item);
}