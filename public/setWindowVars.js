const localsData = document.getElementById('locals-data');
//console.log('locals (pure)', localsData.textContent);

const locals = localsData ? JSON.parse(localsData.textContent) : {};


console.log('locals', locals);

for (let key in locals) {
    if (locals.hasOwnProperty(key)) {
        window[key] = locals[key];
    }
}