const {spawn} = require('child_process')

const command = {
    play: "Play",
    pause: "Pause",
    nextTrack: "Next",
    previousTrack: "Previous",
    like: "Like",
    dislike: "Dislike",
    toggleLyrics: "Show/Hide Lyrics",
    exit: `tell application "System Events" to tell process "NeteaseMusic"
                click menu item 11 of menu 1 of menu bar item 2 of menu bar 1
           end tell`,
    getMenuControlFirstItemText: `set NeteaseMusicApp to "/Applications/NeteaseMusic.app" as POSIX file
                                  tell application "System Events" to tell process "NeteaseMusic"
                                        tell menu 1 of menu bar item 4 of menu bar 1
                                            set playText to localized string of "Play" in bundle NeteaseMusicApp
                                            set PauseText to localized string of "Pause" in bundle NeteaseMusicApp
                                            if name of menu item 1 = playText then
                                                return "PLAY"
                                            else if name of menu item 1 = PauseText then
                                                return "PAUSE"
                                            else
                                                return "UNKNOWN"
                                            end if
                                        end tell
                                    end tell`,
    genMenuControlScript: (textKey) => {
        return `tell application "System Events" to tell process "NeteaseMusic"
                    tell menu 1 of menu bar item 4 of menu bar 1
                        try
                            click menu item my localizedString("${textKey}")
                        end try
                    end tell
                end tell
                
                on localizedString(key)
                    set NeteaseMusicApp to "/Applications/NeteaseMusic.app" as POSIX file
                    return localized string of key in bundle NeteaseMusicApp
                end localizedString`
    }
}

async function runNeteaseMusic(script) {
    try {
        return await runAppleScript(script)
    } catch (e) {
        window.utools.showNotification(e)
        exitPlugin()
    }
}

async function runAppleScript(script) {
    if (!window.utools.isMacOS()) {
        throw new Error('MacOS only supported.')
    }
    const {stdout, stderr, killed, code} = await runCommand('osascript', ['-e', script], 1000)
    if (stdout) {
        return stdout
    } else if (stderr) {
        throw new Error(stderr)
    } else if (killed) {
        throw new Error('NeteaseMusic is not running.')
    }
    return ''
}


async function runCommand(command, args, timeout) {
    return new Promise((resolve, reject) => {
        const ls = spawn(command, args)

        setTimeout(function () {
            ls.kill()
        }, timeout)

        let stdout = ''
        let stderr = ''

        ls.stdout.on('data', (data) => {
            stdout = data.toString()
        })

        ls.stderr.on('data', (data) => {
            stderr = data.toString()
        })

        ls.on('close', (code) => {
            resolve({stdout, stderr, code, killed: ls.killed})
        })

        ls.on('error', (err) => {
            reject(err)
        })
    })
}

async function getPlayState() {
    const res = await runNeteaseMusic(command.getMenuControlFirstItemText, [])
    if (res === 'exit') {
        return "EXIT"
    } else if (res.includes('PAUSE')) {
        return "PLAYING"
    } else if (res.includes('PLAY')) {
        return "PAUSED"
    }
    return undefined;
}

function exitPlugin() {
    window.utools.hideMainWindow()
    window.utools.outPlugin()
}

let Controller = {
    previousTrack(){
        return runNeteaseMusic(command.genMenuControlScript(command.previousTrack))
    },
    nextTrack(){
        return runNeteaseMusic(command.genMenuControlScript(command.nextTrack))
    },
    like(){
        return runNeteaseMusic(command.genMenuControlScript(command.like))
    },
    dislike(){
        return runNeteaseMusic(command.genMenuControlScript(command.dislike))
    },
    async playPause() {
        let state = (await getPlayState())
        if (state === 'PLAYING'){
            return  runNeteaseMusic(command.genMenuControlScript(command.pause))
        } else{
            return  runNeteaseMusic(command.genMenuControlScript(command.play))
        }
    },
    exit(){
        return runNeteaseMusic(command.exit)
    },
    toggleLyrics(){
        return runNeteaseMusic(command.genMenuControlScript(command.toggleLyrics))
    }
}

window.exports = {
    "previousTrack": {
        mode: "none",
        args: {
            enter: async (action) => {
                await Controller.previousTrack();
                exitPlugin()
            }
        }
    },
    "nextTrack": {
        mode: "none",
        args: {
            enter: async (action) => {
                await Controller.nextTrack();
                exitPlugin()
            }
        }
    },
    "like": {
        mode: "none",
        args: {
            enter: async (action) => {
                await Controller.like();
                exitPlugin()
            }
        }
    },
    "dislike": {
        mode: "none",
        args: {
            enter: async (action) => {
                await Controller.dislike()
                exitPlugin()
            }
        }
    },
    "play/pause": {
        mode: "none",
        args: {
            enter: async (action) => {
                await Controller.playPause()
                exitPlugin()
            }
        }
    },
    "toggleLyrics": {
        mode: "none",
        args: {
            enter: async (action) => {
                await Controller.toggleLyrics()
                exitPlugin()
            }
        }
    },
    "exit": {
        mode: "none",
        args: {
            enter: async (action) => {
                await Controller.exit()
                exitPlugin()
            }
        }
    },
    "allCommand": {
        mode: "list",
        args: {
            // 进入插件应用时调用（可选）
            enter: (action, callbackSetList) => {
                callbackSetList([
                    {title: '播放/暂停', description: "网易云音乐 - 播放/暂停", icon: 'netease.png', cmd: Controller.playPause},
                    {title: '上一首', description: "网易云音乐 - 上一首", icon: 'netease.png', cmd: Controller.previousTrack},
                    {title: '下一首', description: "网易云音乐 - 下一首", icon: 'netease.png', cmd: Controller.nextTrack},
                    {title: '喜欢', description: "网易云音乐 - 喜欢", icon: 'netease.png', cmd: Controller.like},
                    {title: '取消喜欢', description: "网易云音乐 - 取消喜欢", icon: 'netease.png', cmd: Controller.dislike},
                    {title: '打开/关闭歌词', description: "网易云音乐 - 打开/关闭歌词", icon: 'netease.png', cmd: Controller.toggleLyrics},
                    {title: '退出网易云', description: "网易云音乐 - 退出", icon: 'netease.png', cmd: Controller.exit},
                ])
            },
            select: async (action, itemData, callbackSetList) => {
                await itemData.cmd()
                exitPlugin()
            }
        }
    }
}

