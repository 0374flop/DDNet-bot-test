const fs = require('fs');
const path = require('path');
const DDRaceBot = require('neiky-ddracebot.js');

let servers = [
    "45.141.57.31",
    "45.141.57.22",
    "57.128.201.180"
];

let ports = [8030, 9000];

let port2 = [];
for (let i = ports[0]; i <= ports[1]; i++) {
    port2.push(i);
}

const serverListPath = path.join(__dirname, 'DDList.json');

async function updateServers() {
    let newServerList = [];
    
    // Создаём по одному боту на каждый сервер
    for (let server of servers) {
        try {
            await new Promise((resolve, reject) => {
                let client = new DDRaceBot.Client(server, port2[0], "aboba");
                let currentPortIndex = 0;
                let reconnectAttempts = 0;
                const maxReconnectAttempts = 1; // Только одна повторная попытка
                
                const timeout = setTimeout(() => {
                    client.Disconnect();
                    console.log(`⏰ Timeout for ${server}:${port2[currentPortIndex]} after 25 seconds`);
                    currentPortIndex++;
                    reconnectAttempts = 0;
                    tryNextPort();
                }, 25000); // 25 секунд таймаут
                
                function tryNextPort() {
                    if (currentPortIndex >= port2.length) {
                        clearTimeout(timeout);
                        resolve();
                        return;
                    }
                    
                    let port = port2[currentPortIndex];
                    console.log(`Trying ${server}:${port}`);
                    
                    client = new DDRaceBot.Client(server, port, "aboba");
                    client.joinDDRaceServer();
                }
                
                client.on("connection_au_serveur_ddrace", () => {
                    let port = port2[currentPortIndex];
                    console.log(`✅ Connected to ${server}:${port}`);
                    newServerList.push(`${server}:${port}`);
                    client.game.Say("...");
                    
                    // Быстрое отключение после успешного подключения
                    setTimeout(() => {
                        client.Disconnect();
                        currentPortIndex++;
                        reconnectAttempts = 0;
                        tryNextPort();
                    }, 50); // Уменьшил до 50мс
                });
                
                client.on("disconnect", () => {
                    let port = port2[currentPortIndex];
                    
                    if (reconnectAttempts < maxReconnectAttempts) {
                        console.log(`🔄 Reconnecting to ${server}:${port} (attempt ${reconnectAttempts + 1})`);
                        reconnectAttempts++;
                        client.joinDDRaceServer();
                    } else {
                        console.log(`❌ Failed to connect to ${server}:${port} after ${maxReconnectAttempts + 1} attempts`);
                        currentPortIndex++;
                        reconnectAttempts = 0;
                        tryNextPort();
                    }
                });
                
                client.on("error", (error) => {
                    let port = port2[currentPortIndex];
                    console.log(`❌ Error connecting to ${server}:${port}:`, error.message);
                    currentPortIndex++;
                    reconnectAttempts = 0;
                    tryNextPort();
                });
                
                // Начинаем с первого порта
                tryNextPort();
            });
        } catch (error) {
            console.log(`Failed to connect to ${server}:`, error.message);
        }
    }
    
    return newServerList;
}

function saveServerList(serverList, path) {
    fs.writeFileSync(path, JSON.stringify(serverList, null, 2));
}

async function main() {
    let serverList = await updateServers();
    saveServerList(serverList, serverListPath);
}

main();