const versePopper = (evt) => {
  console.log(evt.target);
  const t = evt.target;
  if(t.parentNode.firstChild.textContent.trim() == ''){
    t.parentNode.firstChild.textContent = t.title;
  } else {
    t.parentNode.firstChild.textContent = '';
  }
};
window.onload = () => {
  const verseButtons = document.getElementsByClassName('verseButton');
  for(let i=0; i<verseButtons.length; i++){
    verseButtons[i].onclick = versePopper;
  }
};