import {start,type Room} from '../game';
import {assertMafiaSetupEditable,mafiaSetupView,setMafiaConfig,defaultMafiaConfig,activeMafiaPlayers,mafiaRosterKey,validateMafiaConfig} from './config';
import type {openMafiaPresets} from './presets';
export function mafiaSetupCommand(r:Room,a:any,presets:ReturnType<typeof openMafiaPresets>){
 if(a.type==='mafia:preset:list')return{items:presets.list()};assertMafiaSetupEditable(r);
 switch(a.type){
 case 'mafia:configure':return{setup:setMafiaConfig(r,a.config,a.revision)};
 case 'mafia:setup:reset':return{setup:setMafiaConfig(r,defaultMafiaConfig(activeMafiaPlayers(r).length),a.revision,'')};
 case 'mafia:preset:load':{const item=presets.get(String(a.id));return{setup:setMafiaConfig(r,item.config,a.revision,item.id),item,items:presets.list()};}
 case 'mafia:preset:save':{const current=mafiaSetupView(r);if(a.revision!==current.revision)throw Error('직업 설정이 변경되었습니다.');if(!current.validation.valid)throw Error(current.validation.errors.join(' '));const item=presets.save({id:a.id?String(a.id):undefined,name:a.name,config:current.config,revision:a.presetRevision});setMafiaConfig(r,current.config,current.revision,item.id);return{setup:mafiaSetupView(r),item,items:presets.list()};}
 case 'mafia:preset:rename':{const item=presets.rename(String(a.id),a.name,a.presetRevision);return{item,items:presets.list()};}
 case 'mafia:preset:delete':presets.remove(String(a.id),a.presetRevision);if(r.mafiaSetup&&r.mafiaSetup.presetId===a.id)r.mafiaSetup.presetId=undefined;return{items:presets.list()};
 case 'mafia:preset:restore':return{items:presets.restoreDefaults()};
 default:throw Error('잘못된 마피아 설정 요청입니다.');}
}
export function startMafiaRequest(r:Room,a:any){
 const requestId=a.requestId;if(requestId!==undefined&&(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{8,80}$/.test(requestId)))throw Error('시작 요청 ID를 확인하세요.');
 if(requestId&&r.mafiaStartRequests?.has(requestId)){const old=r.mafiaStartRequests.get(requestId)!;if(a.mafiaSetupRevision!==old.revision||a.mafiaRosterKey!==old.rosterKey)throw Error('이미 사용한 시작 요청입니다.');if(r.round?.id!==old.roundId)throw Error('이미 처리한 게임 시작 요청입니다. 새로 시작하세요.');return{duplicate:true};}
 assertMafiaSetupEditable(r);const revision=r.mafiaSetup?.revision||0,rosterKey=mafiaRosterKey(r);if(a.mafiaSetupRevision!==undefined&&a.mafiaSetupRevision!==revision)throw Error('직업 설정이 변경되었습니다. 다시 확인하세요.');if(a.mafiaRosterKey!==undefined&&a.mafiaRosterKey!==rosterKey)throw Error('참가자 구성이 변경되었습니다. 현재 인원으로 다시 확인하세요.');
 const config=mafiaSetupView(r).config,check=validateMafiaConfig(config,activeMafiaPlayers(r).length);if(!check.valid)throw Error(check.errors.join(' '));start(r,'mafia');if(requestId){r.mafiaStartRequests??=new Map();r.mafiaStartRequests.set(requestId,{roundId:r.round!.id,revision:a.mafiaSetupRevision,rosterKey:a.mafiaRosterKey});}return{duplicate:false};
}
