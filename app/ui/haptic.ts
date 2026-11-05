// iOS gives no vibration API, but Safari 18+ ticks when a label toggles an <input switch>.
let label:HTMLLabelElement|null=null;
export function haptic(){
 if(typeof document==='undefined')return;
 // Scrolling can fire this before the first tap, when browsers refuse and log an error.
 if(navigator.userActivation&&!navigator.userActivation.hasBeenActive)return;
 if('vibrate' in navigator){navigator.vibrate(8);return;}
 if(!label){
  const input=document.createElement('input');
  input.type='checkbox';input.id='cardi-haptic';input.setAttribute('switch','');input.hidden=true;
  label=document.createElement('label');label.htmlFor=input.id;label.hidden=true;
  document.body.append(input,label);
 }
 label.click();
}
