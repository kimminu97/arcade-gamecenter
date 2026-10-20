import data from './questions.json' with {type:'json'};import type{Stroke}from'./game';
// 공개된 테스트용 도형 사전. 관찰 가능한 획만 비교하며 서버의 비밀 제시어를 읽지 않는다.
export function fixtureDrawing(word:string):Stroke[]{const index=data.words.indexOf(word);if(index<0)return[];const lines:Stroke[]=[];const line=(px:number,py:number,x:number,y:number)=>lines.push({px,py,x,y,color:'#496dff',width:5});
 // 서로 구별 가능한 공개 도형: 집 모양 + 단어 번호를 나타내는 여섯 개의 비트 막대.
 line(.2,.5,.5,.18);line(.5,.18,.8,.5);line(.8,.5,.8,.85);line(.8,.85,.2,.85);line(.2,.85,.2,.5);
 for(let bit=0;bit<6;bit++){const x=.3+bit*.075;line(x,.7,x,(index&(1<<bit))?.4:.57);}return lines;}
export function recognizeDrawing(strokes:Stroke[]){return data.words.find(word=>{const f=fixtureDrawing(word);return strokes.length>=f.length&&f.every((s,i)=>['x','y','px','py'].every(k=>Math.abs(Number(s[k as keyof Stroke])-Number(strokes[i][k as keyof Stroke]))<.003));});}
