# Open-forum
A lightweight, real-time chat forum built with NodeJS and MySQL, developed for my CS-389 class
<HR>

OpenForum is a lightweight, real-time, open-source chat forum designed intended for discussion of technical topics. Open-forum's chat system is divided into channels, which are further divided into threads, with every thread being a question or subtopic, and every channel acting as a place to discuss a specific subject.  NodeJS was chosen as the backend for its performance and simplicity, MySQL is used to store data, expressJS handles routing and web requests, while socketIO provides real-time updates which propagate between clients. To efficiently load messages between the client and the server, Open-forum has a basic streaming system that dynamically loads messages in chunks, rather than all at once. A basic notification system handles pinging users, and if the target user is offline the notification will be stored and then loaded the next time that they log in to Openforum. 

<HR>

![image](https://github.com/user-attachments/assets/9a42af42-6571-44af-a09b-38a9c4f56a81)
