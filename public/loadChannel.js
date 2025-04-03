function loadThreads(threads) {
    let threadsHolder = document.getElementById("channelThreadsHolder");

    let HTML = '<UL style= "margin: 0; padding: 0;">'


    for (let thread of threads) {
        HTML += "<div class=threadHeaderHolder>";
        console.log(thread.name);
        HTML += `<p class=threadHeaderTitle> ${thread.name} </p>`
        HTML += "</div>"
    }

    threadsHolder.innerHTML = HTML;
}