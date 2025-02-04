const express = require("express");
const cors = require("cors");
const http = require("http")
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const app = express();
const server = http.createServer(app)
const PORT = 5000
const Rooms = [{ user: 1, code: 11111 }, { user: 1, code: 39927 }]
const member = {}
const names = ["Pandit", "Ranga", "zulfu", "gingad", "Adwani", "Ambani", "Bishnoi", "Salman"];
const color = ["#FF4136", "#FF851B", "#FFDC00", "#2ECC40", "#0074D9", "#B10DC9", "#F012BE", "#7FDBFF", "#01FF70", "#F500F5"];


const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const random = () => {
    return Math.floor(10000 + Math.random() * 90000)
}

const assignRandomAttributes = (assignedUsers) => {
    let availableNames = names.filter(name => !assignedUsers.some(user => user.name === name));
    let availableColors = color.filter(color => !assignedUsers.some(user => user.color === color));

    const randomName = availableNames[Math.floor(Math.random() * availableNames.length)];
    const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];

    return { name: randomName, color: randomColor };
}


app.use(express.json())
app.use(cors());

app.get("/create", (req, res) => {
    const code = random();
    const room = { user: 1, code: code }
    Rooms.push(room);
    res.status(201).json(code);
})


io.on('connection', (socket) => {
    socket.on('joinRoom', (roomId) => {
        const roomIdStr = String(roomId);
        if (!member[roomIdStr]) {
            member[roomIdStr] = []
        }

        const roomExists = Rooms.find((r) => r.code == roomIdStr);

        if (roomExists) {
            const userAttributes = assignRandomAttributes(member[roomIdStr]);
            member[roomIdStr].push({ socketId: socket.id, ...userAttributes });

            socket.join(roomIdStr);

            socket.emit('assignedAttributes', userAttributes);
            io.to(String(roomIdStr)).emit('roomusers', member[roomIdStr]);
        } else {
            console.log(`Room ${roomIdStr} does not exist, cannot join.`);
        }

        const clientsInRoom = io.sockets.adapter.rooms.get(roomIdStr);
    });



    socket.on('message', (data) => {
        const user = member[String(data.roomId)].find((item) => item.socketId == socket.id)

        io.to(String(data.roomId)).emit('message', {
            message: data.message,
            name: user.name,
            color: user.color
        });
    });

    socket.on('send-file', (data) => {
        const user = member[String(data.roomId)].find((item) => item.socketId == socket.id)

        const { roomId, fileName, fileBuffer } = data;
        const buffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer, 'binary');

        const filePath = path.join(__dirname, 'uploads', fileName);
        if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
            fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
        }

        fs.writeFileSync(filePath, buffer);
        console.log(`File saved at ${filePath}`);
        io.to(String(roomId)).emit('fileBroadcast', { fileName, fileBuffer, name: user.name });
    });

    socket.on('user-left', ({ code, name }) => {
        const leftname = name;
        if (member[String(code)]) {
            member[String(code)] = member[String(code)].filter(item =>
                item.name !== name)
        }
        const newusers = member[String(code)]
        io.to(String(code)).emit('update-users', { newusers, leftname })
    })
    socket.on('disconnect', () => {

    });
});



app.post("/delete", (req, res) => {
    try {
        const code = req.body.code;
        let index = -1
        Rooms.forEach((item, i) => {
            if (item.code == code) {
                item.user = item.user - 1;
            }
            if (item.user == 0) {
                index = i
            }
        })
        if (index !== -1) {
            
            const roomDirectoryPath = path.join(__dirname, 'uploads', code);

            if (fs.existsSync(roomDirectoryPath)) {
                const files = fs.readdirSync(roomDirectoryPath); // Read files in the room's folder
                files.forEach((file) => {
                    const filePath = path.join(roomDirectoryPath, file);
                    fs.unlinkSync(filePath); // Delete each file
                });

                // After deleting the files, remove the room directory if it's empty
                fs.rmdirSync(roomDirectoryPath);
                console.log(`Removed all files and directory for room ${code}`);
            }

            Rooms.splice(index, 1);
            delete member[code]
        }
        res.sendStatus(201);
    } catch (error) {
        res.sendStatus(400);
    }
});


app.post("/join", (req, res) => {
    const code = req.body.code;
    if (Rooms.length == 0) {
        res.status(400).send({ message: "Room doesnt exist" });
    }
    else {
        const result = Rooms.filter((item) => item.code == code)
        if (result.length !== 0) {
            result[0].user += 1;
            res.status(200).send({ message: "Room exist you are added to it" });
        }
        else {
            res.status(400).send({ message: "Room doesnt exist" });
        }
    }
})


server.listen(PORT, () => {
    console.log("im HIGH On PORT : - 5000")
});