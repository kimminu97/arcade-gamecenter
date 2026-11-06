import type {NetworkInterfaceInfo} from 'node:os';

// Candidates only: the Host still chooses the adapter reachable by the phones.
export function lanAddresses(interfaces:NodeJS.Dict<NetworkInterfaceInfo[]>,port:number){
 return [...new Set(Object.values(interfaces).flatMap(entries=>entries??[])
  .filter(a=>a.family==='IPv4'&&!a.internal&&!a.address.startsWith('169.254.')&&a.address!=='0.0.0.0')
  .map(a=>`http://${a.address}:${port}`))];
}
