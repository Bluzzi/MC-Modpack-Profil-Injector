let slider = document.getElementById("memory");

slider.min = 2000;
slider.max = require("os").freemem / Math.pow(1024, 2);
slider.value = Math.round(slider.max / 2);

updateValueIndicator(slider);

/**
 * @param {HTMLElement} slider 
 */
function updateValueIndicator(slider){
    let text = document.getElementById("memory-text");

    text.innerHTML = "Dédiée : " + slider.value.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Mo"; 
}