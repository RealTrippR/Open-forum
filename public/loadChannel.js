//import threads from '/loadThreads.js';

function askServerToCreateThread(threadName, threadDescription) {
    fetch('/api-create-thread',
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: threadName,
            description: threadDescription,
            channelID: window.currentChannel.id
        })
    })
    .then((res) => {
        if (!res.ok) {
            throw new Error('Bad sever response');
        }
        return res.json();
    })
    .then((json) => {
        window.currentChannel.threads = json.threads;
        loadThreads(window.currentChannel.threads);
    })
    .catch(error => {
        console.error('Fetch error:', error);
    });
}

function createStagingThread() {

    const threadsHolder = document.getElementById("channelThreadsHolder");
    threadsHolder.innerHTML = '';

    // create staging thread if it does not exist
    let stagingThreadDropdownButtonDIV = document.getElementById('stagingThreadDropdownButton');
    if (stagingThreadDropdownButtonDIV==null) {
        stagingThreadDropdownButtonDIV = document.createElement('div');
        const div = stagingThreadDropdownButtonDIV;

        div.id = 'stagingThreadDropdownButton';
        div.style.backgroundColor = 'var(--backgroundColor)'
        div.style.height = '26px';
        div.style.border = 'var(--stdBorder)'
        div.style.display = 'flex'

        
        const p = document.createElement('p');
        p.className = 'stdText';
        p.textContent = 'Create Thread'
        p.style.margin = '0px auto'
        p.style.fontSize = 26
        div.appendChild(p);

        div.addEventListener('click', () => {
            const stagingThreadDiv = document.getElementById('stagingThread');
            if (stagingThreadDiv.style.display === 'none') {
                stagingThreadDiv.style.display = 'block'; // Show
            } else {
                stagingThreadDiv.style.display = 'none'; // Hide
            }
            console.log('click');
        });

        threadsHolder.appendChild(div);
    }

    // create staging thread if it does not exist
    let stagingThread = document.getElementById('stagingThread');
    if (stagingThread == null) {
        stagingThread = document.createElement('div');
        stagingThread.id = 'stagingThread'
        stagingThread.className = 'threadHeaderHolder'
        stagingThread.style.padding = '10px'
        stagingThread.style.display = 'none';

        const nameInput = document.createElement("input");
        nameInput.id = 'nameInput';
        nameInput.type = 'text';
        nameInput.textContent = "";
        nameInput.placeholder = "Enter Thread Name";
        nameInput.style.backgroundColor = 'var(--navBarColor)';
        stagingThread.appendChild(nameInput);

        let hr = document.createElement('hr');
        stagingThread.append(hr);

        const descriptionInput = document.createElement("input");
        descriptionInput.id = 'descriptionInput';
        descriptionInput.className = "threadHeaderTitle";
        descriptionInput.type = 'text';
        descriptionInput.textContent = "";
        descriptionInput.placeholder = "Enter Description";
        descriptionInput.style.backgroundColor = 'var(--navBarColor)';
        
        stagingThread.appendChild(descriptionInput);

        hr = document.createElement('hr');
        stagingThread.append(hr);        

        const postButton = document.createElement('button');
        postButton.textContent = 'post';

        postButton.addEventListener('click', () =>
        {
            console.log("post clicked!");
            let name = document.getElementById('nameInput');
            name = name.value;
            let description = document.getElementById('descriptionInput');
            description = description.value;
            
            askServerToCreateThread(name, description);
        });

        stagingThread.appendChild(postButton);
    }

    threadsHolder.appendChild(stagingThread);
}


function loadThreads(threads) {
    console.log("Load Threads: ", threads);

    if (window.loggedIn == undefined) {
        window.loggedIn = false;
    }

    if (window.loggedIn) {
        createStagingThread();
    }

    const threadsHolder = document.getElementById("channelThreadsHolder");
    // delete old threads
    threadsHolder.innerHTML = '';

    // first destroy ul list if it exists
    // add UL list
    const UL = document.createElement('UL');
    UL.style.margin = '0'
    UL.style.padding = '0';

    for (let thread of threads) {
        // thread header holder
        const thh = document.createElement("div");
        thh.className = "threadHeaderHolder";
        thh.dataset.threadID = thread.id;
        thh.addEventListener('click', loadThreadFromThreadHandleButton);

        const title = document.createElement("p");
        title.className = "threadHeaderTitle";
        title.textContent = thread.name; // assuming thread.name is defined

        thh.appendChild(title); // add <p> to the <div>
        
        const desc = document.createElement("p");
        desc.className = "stdMinorText";
        desc.textContent = thread.description; // assuming thread.name is defined
        thh.appendChild(desc); // add <p> to the <div>



        // more data, including the user that made it and date of creation
        threadsHolder.appendChild(thh);
    }
}