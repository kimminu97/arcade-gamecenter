/** Pure server adjudication. Player IDs, not names, determine all outcomes. */
export function resolveCourt(ids:string[],votes:Record<string,string>,submitted:Record<string,boolean>,selfVote=true){
 const members=new Set(ids),voteCounts:Record<string,number>=Object.fromEntries(ids.map(id=>[id,0]));
 for(const [voter,target] of Object.entries(votes))if(members.has(voter)&&members.has(target)&&(selfVote||voter!==target))voteCounts[target]++;
 const validVoteCount=Object.values(voteCounts).reduce((a,b)=>a+b,0),highestVoteCount=Math.max(0,...Object.values(voteCounts)),isInvalidRound=validVoteCount===0;
 const topVotedPlayerIds=isInvalidRound?[]:ids.filter(id=>voteCounts[id]===highestVoteCount);
 const predictions:Record<string,boolean>=Object.fromEntries(ids.map(id=>[id,submitted[id]===true]));
 const missingPredictionPlayerIds=ids.filter(id=>submitted[id]===undefined);
 const successfulPredictorIds=topVotedPlayerIds.filter(id=>predictions[id]);
 const penaltyPlayerIds=isInvalidRound?[]:successfulPredictorIds.length?ids.filter(id=>!successfulPredictorIds.includes(id)):ids.filter(id=>topVotedPlayerIds.includes(id)||predictions[id]);
 // Negative predictions can earn points even when case A assigns a penalty.
 const correctPredictionPlayerIds=isInvalidRound?[]:ids.filter(id=>typeof submitted[id]==='boolean'&&predictions[id]===topVotedPlayerIds.includes(id));
 return{voteCounts,validVoteCount,highestVoteCount,topVotedPlayerIds,predictions,missingPredictionPlayerIds,successfulPredictorIds,penaltyPlayerIds,correctPredictionPlayerIds,isTie:topVotedPlayerIds.length>1,isInvalidRound};
}
