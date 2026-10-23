import {spyQuestions,quality} from '../server/spy-bank';
const evaluated=spyQuestions.map(q=>({id:q.id,...quality(q)}));
const counts=(key:'category'|'answerType')=>Object.fromEntries([...new Set(spyQuestions.map(q=>q[key]))].map(k=>[k,spyQuestions.filter(q=>q[key]===k).length]));
const report={sets:spyQuestions.length,categories:counts('category'),answerTypes:counts('answerType'),duplicateIds:spyQuestions.length-new Set(spyQuestions.map(q=>q.id)).size,duplicateTexts:200-new Set(spyQuestions.flatMap(q=>[q.normalQuestion,q.spyQuestion])).size,heuristicOnly:true,minimum:100,questions:evaluated};
console.log(JSON.stringify(report,null,2));
if(report.sets!==100||report.duplicateIds||report.duplicateTexts||evaluated.some(q=>q.score<100))process.exitCode=1;
