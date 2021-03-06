const express = require("express");
const socketIO = require("socket.io");

const http = require("http");
const path = require("path");
const app = express();

const Pokemons = require("./data/pokedex/pokemon.json");
const Moves = require("./data/pokedex/moves.json");

app.use(express.static(path.join(__dirname, "./data/pokedex")));

const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const io = socketIO(server);

const Users = require("./utils/Users");
const { attack } = require("./utils/attack");

io.on("connection", socket => {
  socket.on("join", async data => {
    try {
      const usersInRoom = await Users.countUsers(data.room);
      if (usersInRoom >= 2) {
        socket.emit("exception", "Room is full");
      } else {
        await Users.addUser(
          {
            id:socket.id,
            username:data.username,
            room:data.room,
            pokemon:data.pokemon,
            pokemonHP:data.pokemonHP,
            attack: data.attack,
            defence: data.defence,
            sp_attack: data.sp_attack,
            sp_defence: data.sp_defence,
            speed: data.speed
          }
        ); // shouldnt be able to add user by same username
        await Users.addUserInRoom(data.room, socket.id);
        socket.join(data.room);
        const playerList = await Users.getUsersByRoom(data.room);
        if (playerList.length === 2) {
          io.to(data.room).emit("opponentJoined", playerList);
        }
      }
    } catch (err) {
      socket.emit("exception", "Some error occurred");
      console.log(err);
    }
  });
  socket.on("attack", async data => {
    // Get user room name
    // Call attack function in attack.js to handle the attack
    // Emit a new event to update the HP and handle it in Playground.js
    const user = await Users.getUser(socket.id);
    attack(
      socket.id,
      data.hp,
      data.targetName,
      data.attackerName,
      data.attackName
    )
      .then(newHP => {
        if (newHP) {
          // emit hp updation events , one to player and one to opponent
          // can be better ?
          socket.broadcast.to(user.room).emit("playerHPUpdate", {
            newHP
          });
          socket.emit("opponentHPUpdate", {
            newHP
          });
        }
      })
      .catch(err => {
        console.log(err);
      });
  });
  socket.on("disconnect", async () => {
    const user = await Users.getUser(socket.id);
    if (user && user.room) {
      await Users.deleteRoom(user.room);
      socket.broadcast.to(user.room).emit("opponentLeft");
    }
  });
});

// REST routes
app.get("/pokemon/names", (req, res) => {
  res.json(Pokemons.map(pokemon => pokemon.name));
});
app.get("/pokemons/:name", (req, res) => {
  res.json(Pokemons.filter(pokemon => pokemon.name === req.params.name)[0]);
});
app.get("/moves/:id", (req, res) => {
  const move = Moves.filter(move => move.id === Number(req.params.id))[0];
  res.json(move);
});

server.listen(PORT, () => {
  console.log("Server has started");
});
