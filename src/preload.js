const {spawn} = require('child_process')

const command = {
    play: `click menu item "播放"`,
    pause: `click menu item "暂停"`,
    nextTrack: `click menu item "下一个"`,
    previousTrack: `click menu item "上一个"`,
    like: `click menu item "喜欢歌曲"`,
    dislike: `click menu item "取消喜欢"`,
    toggleLyrics: `click menu item "打开/关闭歌词"`,
    exit: `tell application "System Events" to tell process "NeteaseMusic"
                click menu item "退出 网易云音乐" of menu "网易云音乐" of menu bar item "网易云音乐" of menu bar 1
           end tell`,
    getMenuControlFirstItemText: `tell application "System Events" to tell process "NeteaseMusic"
                                        tell menu "控制" of menu bar item "控制" of menu bar 1
                                            set val to menu item 1
                                        end tell
                                    end tell
                                return val`,
    genMenuControlScript: (controlScript) => {
        return `tell application "System Events" to tell process "NeteaseMusic"
                    tell menu "控制" of menu bar item "控制" of menu bar 1
                        ${controlScript}
                    end tell
                end tell`
    }
}

async function runNeteaseMusic(script, ignoreErr) {
    try {
        return await runAppleScript(command.genMenuControlScript(script))
    } catch (e) {
        const errMessage = `${e}`
        if (errMessage.includes('不能获得“process "NeteaseMusic"”')) {
            return "Exit"
        }
        if (ignoreErr.length > 0) {
            for (const err of ignoreErr) {
                if (errMessage.includes(err)) {
                    return ''
                }
            }
        }
        window.utools.showNotification(errMessage)
    }
}

async function runAppleScript(script) {
    if (!window.utools.isMacOS()) {
        throw new Error('仅支持MacOS')
    }
    const {stdout, stderr, killed, code} = await runCommand('osascript', ['-e', script], 1000)
    if (stdout) {
        return stdout
    } else if (stderr) {
        throw new Error(stderr)
    } else if (killed) {
        throw new Error('网易云音乐未启动')
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
    } else if (res.includes('menu item 暂停')) {
        return "PLAYING"
    } else if (res.includes('menu item 播放')) {
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
        return runNeteaseMusic(command.genMenuControlScript(command.previousTrack), [])
    },
    nextTrack(){
        return runNeteaseMusic(command.genMenuControlScript(command.nextTrack), [])
    },
    like(){
        return runNeteaseMusic(command.genMenuControlScript(command.like), [`不能获得“menu item "喜欢歌曲"`])
    },
    dislike(){
        return runNeteaseMusic(command.genMenuControlScript(command.dislike), [`不能获得“menu item "取消喜欢"`])
    },
    async playPause() {
        let state = (await getPlayState())
        if (state === 'PLAYING'){
            return  runNeteaseMusic(command.genMenuControlScript(command.pause), [`不能获得“menu item "暂停"`])
        } else{
            return  runNeteaseMusic(command.genMenuControlScript(command.play), [`不能获得“menu item "播放"`])
        }
    },
    exit(){
        return runNeteaseMusic(command.genMenuControlScript(command.exit), [])
    },
    toggleLyrics(){
        return runNeteaseMusic(command.genMenuControlScript(command.toggleLyrics), [])
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
                    {title: '播放/暂停', description: "网易云音乐 - 暂停", icon: 'netease.png', cmd: Controller.playPause},
                    {title: '上一首', description: "网易云音乐 - 上一首", icon: 'netease.png', cmd: Controller.previousTrack},
                    {title: '下一首', description: "网易云音乐 - 下一首", icon: 'netease.png', cmd: Controller.nextTrack},
                    {title: '喜欢', description: "网易云音乐 - 喜欢", icon: 'netease.png', cmd: Controller.like},
                    {title: '取消喜欢', description: "网易云音乐 - 取消喜欢", icon: 'netease.png', cmd: Controller.dislike},
                    {title: '打开/关闭歌词', description: "网易云音乐 - 打开/关闭歌词", icon: 'netease.png', cmd: Controller.toggleLyrics},
                    {title: '退出', description: "网易云音乐 - 退出", icon: 'netease.png', cmd: Controller.exit},
                ])
            },
            select: async (action, itemData, callbackSetList) => {
                await itemData.cmd()
                exitPlugin()
            }
        }
    }
}

