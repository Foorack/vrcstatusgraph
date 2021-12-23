const fs = require('fs');

// Check for param key
if (process.argv.length < 3) {
    console.log('Usage: node generate.js <key>');
    process.exit(1);
}

// Create class Invite with properties
class Invite {
    constructor(inviter, invitee) {
        this.inviter = inviter;
        this.invitee = invitee;
    }
}
class Person {
    constructor(id) {
        this.id = id;
        this.name = "";
        this.icon = "";
    }
}

// Load invite data and map to Invite objects
const loadInvites = () => require('./raw.json').map(pair => new Invite(pair[0], pair[1]));

/**
 * Check for duplicate pairs and sanitize for people who have invited themselves.
 * @param {Invite[]} invites
 * @returns {Invite[]}
 */
function sanitize(pairs) {
    const unique = [];
    pairs.forEach(pair => {
        if (!unique.find(u => u[0] === pair.inviter && u[1] === pair.invitee)) {
            unique.push(pair);
        }
    });
    return unique.filter(pair => pair.inviter != pair.invitee);
}

/**
 * Compiles a unique list of people who have been invited.
 * @param {Invite[]} invites
 * @returns {Person[]}
 */
function uniquePeople(invites) {
    const people = [];
    invites.forEach(pair => {
        if (!people.find(p => p.id === pair.inviter)) {
            people.push(new Person(pair.inviter));
        }
        if (!people.find(p => p.id === pair.invitee)) {
            people.push(new Person(pair.invitee));
        }
    });
    return people;
}

// Discord stuff
async function connectDiscord() {
    return new Promise(resolve => {
        const { Client, Intents } = require('discord.js');
        const token = process.argv[2];
        const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
        client.once('ready', () => resolve(client));
        client.login(token);
    });
}

function writeNodes(people) {
    console.log("Nodes:");
    people.forEach(person => console.log(`{ data: { id: '${person.id}', label: '${person.name}' }, style: { "background-image": '${person.icon}' } },`));

    // Convert Person to {data: {id: user, label: name}, style: { background-image: icon }}
    const nodes = people.map(person => {
        return {
            data: {
                id: person.id,
                label: person.name
            },
            style: {
                "background-image": person.icon
            }
        }
    });
    fs.writeFileSync('./nodes.json', JSON.stringify(nodes));
}

function writeEdges(invites) {
    console.log("Edges:");
    invites.forEach(pair => console.log(`{ data: { source: '${pair.inviter}', target: '${pair.invitee}' } },`));

    // Convert Invite to [{data: {source: user1, target: user2}}]
    const edges = invites.map(pair => {
        return {
            data: {
                source: pair.inviter,
                target: pair.invitee
            }
        }
    });
    fs.writeFileSync('./edges.json', JSON.stringify(edges));
}

// ============================================================
// ============================================================
// ============================================================

let invites = loadInvites();

// Sanitize invite data
console.log(`Originally ${invites.length} pairs`);
invites = sanitize(invites);
console.log(`Sanitized to ${invites.length} pairs`);

let people = uniquePeople(invites);

async function main() {
    const client = await connectDiscord();
    console.log('Connected!');

    const statusServer = client.guilds.resolve("819505244605906944");
    const members = statusServer.members;
    console.log(members);

    for (let i = 0; i < people.length; i++) {
        const person = people[i];
        console.log("Fetching user " + person.id);
        try {
            const member = await members.fetch(person.id);
            console.log(member);
            person.name = member.displayName;
            person.icon = member.user.displayAvatarURL();
        } catch (e) {
            console.log("Failed to fetch user " + person.id);
            person.name = "Unknown";
            person.icon = "https://cdn.discordapp.com/embed/avatars/0.png";
        }
    }

    writeNodes(people);
    writeEdges(invites);

    client.destroy();
}

//main();
writeEdges(invites);
