const express = require("express");
const cors = require("cors");
const http = require("http")
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app)
const PORT = 5000
const Rooms = [{ user: 1, code: 11111},{ user: 1, code: 39927 }]
const member = { } 
const names = ["CHUTAD", "LUND", "FUDDI", "GANDU", "BHOSDA", "LULLI", "CHUPA", "TATTA"];
const color = [ "#1B263B", "#2D2A32","#4B3F72","#0D3B66","#343A40","#42273B","#264653","#2C3E50","#3D2C29","#1C1B1A"]


const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins or specify your frontend URL
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
    console.log(code);
    console.log(Rooms);
    res.status(201).json(code);
})


io.on('connection', (socket) => {
    console.log('A user connected:', socket.id); // Log when a user connects


    socket.on('joinRoom', (roomId) => {
        const roomIdStr = String(roomId);  // Convert roomId to a string
        if (!member[roomIdStr]) {
            member[roomIdStr] = []
        }

        // Check if the room exists in the Rooms array
        const roomExists = Rooms.find((r) => r.code == roomIdStr);

        if (roomExists) {
            const userAttributes = assignRandomAttributes(member[roomIdStr]);
                member[roomIdStr].push({ socketId: socket.id, ...userAttributes });
            
            socket.join(roomIdStr);  // Add user to the room
            
            socket.emit('assignedAttributes', userAttributes);
            io.to(String(roomIdStr)).emit('roomusers', member[roomIdStr]);

            console.log(`User ${socket.id} successfully joined room ${roomIdStr}`);
        } else {
            console.log(`Room ${roomIdStr} does not exist, cannot join.`);
        }

        // Log users in the room
        const clientsInRoom = io.sockets.adapter.rooms.get(roomIdStr);
        console.log(`Users in room ${roomIdStr}:`, clientsInRoom);
    });



    socket.on('message', (data) => {
        console.log(`Message received in room ${data.roomId}: ${data.message}`);
        const user = member[String(data.roomId)].find((item)=> item.socketId == socket.id )

        io.to(String(data.roomId)).emit('message', {message: data.message,
                                                    name: user.name,
                                                    color: user.color});  // Broadcast to users in the specific room
        console.log(`Message broadcasted to room ${data.roomId}: ${data.message}`);

    });

    

    // Handle socket disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
    console.log(socket.rooms);
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
            Rooms.splice(index, 1);
            delete member[code]
        }

        console.log(Rooms);
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
        res.sendStatus(400);

    }

});


app.post("/join", (req, res) => {

    const code = req.body.code;
    console.log(code);
    if (Rooms.length == 0) {
        res.status(400).send({ message: "Room doesnt exist" });
    }
    else {
        const result = Rooms.filter((item) => item.code == code)
        if (result.length !== 0) {
            result[0].user += 1;
            console.log(result);
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