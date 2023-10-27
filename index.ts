import Replicate, { WebhookEventType } from "replicate";
import fs from "fs";
import * as msgpack from "@msgpack/msgpack";
console.log("Hello via Bun!");
const succeeded:{ [key: string]: any } = {};
let run = true;

const server = Bun.serve({
    port: 3000,
    fetch: async (request) => {
        //console.log(request)
        if (request.method === "POST") {
            var requestBody = await request.json();
            //console.log(requestBody)
            console.log("update received: "+requestBody.status)
            
            if(requestBody.status === "succeeded" && run) {
                console.log("finished: " + requestBody.id+ " : making next_req");
                //r.nextReq(requestBody.id);
                r.alreadyReqd[requestBody.id] = true;
            }
            if (requestBody.status === "output" || requestBody.status === "processing" || requestBody.status === "log" || requestBody.status === "succeeded") {
                var output = requestBody.output;
                console.log("-------");
                if(requestBody.status != "log") {
                    Object.keys(requestBody).forEach( (k) => {
                        if(k!="logs")
                            console.log(k + " : " + requestBody[k]);
                    });
                }
                try {
                    if(Array.isArray(output)) {
                        output?.forEach(async (o:any) => {
                            //console.log(output.query_embeddings)
                            //console.log(output.document_embeddings)
                            console.log(o.extra_metrics +" : " +o?.document_embeddings.length+ " docs");
                            o?.document_embeddings?.forEach(async (doc_url:any) => {          
                                //console.log("fetching: " + doc_url);
                                var psplit = doc_url.split("/");
                                var fname = psplit[psplit.length-1];//.split(".")[0];
                                if(fname.endsWith('.json')) {
                                    fname = fname.slice(0, -5);
                                }
                                if(succeeded[fname] == undefined) {
                                    succeeded[fname] = fname;     
                                    console.log("awaiting: " + doc_url); 
                                
                                    var doc_resp = await fetch(new URL(doc_url));
                                    var doc_cont = await doc_resp.json(); 
                                    //console.log("parsed: " + doc_url);
                                    var packedData = msgpack.encode(doc_cont);                   
                                    //Ideally we'd use Bun.Write here, but it is not as robust as one might hope. https://github.com/oven-sh/bun/issues/1446
                                    var result = fs.writeFileSync(BINARY_OUTDIR+fname+".msgpack", packedData);
                                    
                                    console.log("wrote: " + fname + "from: "+doc_url);
                                } else {
                                    console.log("skipped " + fname + " : " + succeeded[fname]);
                                }
                            })
                        });
                    } else {
                        console.log("got: " + output.query_embeddings.length + " embeddings.")
                    }
                } catch (e) {
                    console.log(e);
                }
                //console.log("completed -- writing")
                // Do something with the output value
                return new Response(`Added`);
            } else {
                console.log("update received: "+requestBody.status)
                return new Response("Status is not completed.");
            }
        } else if (request.method === "GET") {
            const url = new URL(request.url);
            //console.log(url.search);
            const searchParams = new URLSearchParams(url.search);
            let filename = searchParams.get("get_file");
            let stop_command = searchParams.get("please_stop");
            let contine = searchParams.get("resume");
            if(filename != undefined) {    
                //Ideally we'd use Bun.Read here, but it is not as robust as one might hope. https://github.com/oven-sh/bun/issues/1446
                let resultfile = fs.readFileSync(PREPROCESSED_DIRECTORY+filename);// Bun.file("./jsons/ED545111.json");
                console.log("sending: "+filename);
                //console.log(await resultfile.json())
                return new Response(resultfile,  {headers: {
                    "Content-Type": "application/json",
                }});
            } else if(stop_command != undefined) {
                run = false;
            } else if(contine != undefined) {
                run = true;
            }
                //new Response(resultfile);
            return new Response("hmmmmm");//resultfile);
        } else {      
            return new Response("Bunnnn!");
        }
    },
    tls: {
        cert: Bun.file("./tls/fullchain.pem"),
        key: Bun.file("./tls/privkey.pem"),
    }
});

Bun.write("./process_binary/test_text.json", "test some text")

console.log(`Listening on http://0.0.0.0:${server.port} ...`);

const PREPROCESSED_DIRECTORY = "./jsons/";
const BINARY_OUTDIR = "./process_binary/";

const replicate = new Replicate({
    auth: ''+process.env.REPLICATE_API_TOKEN
});

const replicateRequest = async (
    input_j:Object, webhook = "https://eron.ccrdev.us:3000", 
    webhookEventFilter:WebhookEventType[] = ["start", "output", "logs", "completed"]) => {
        var result = replicate.predictions.create({
            version: "f07cef03944e1ab15cc4a6c4f340a4bb4ca846be56ec52e171d954963e3d40e5",
            input: input_j,
            webhook: webhook,
            webhook_events_filter: webhookEventFilter
        });
        return result;
    }

class RepRequester {
    msgpackIds: string[] = [];
    current_index: number | undefined;
    excerpts_per_request: number;
    request_url: String;
    alreadyReqd:{[key: string]: any} = {}

    constructor(request_url: String, excerpt_files_dir: PathLike, excerpts_per_request: number = 50) {
        //Ideally we'd use Bun.Read here, but it is not as robust as one might hope. https://github.com/oven-sh/bun/issues/1446
        let temp_jsonIds = fs.readdirSync(excerpt_files_dir).filter(f => f.endsWith('.json')).map((f) => f.slice(0, -5));
        for(var i=0; i<temp_jsonIds.length; i++) {
            if(!fs.existsSync(BINARY_OUTDIR+temp_jsonIds[i]+".msgpack")
            && !fs.existsSync(BINARY_OUTDIR+temp_jsonIds[i]+".json")) {
                this.msgpackIds.push(temp_jsonIds[i]);
            }
        }
        this.request_url = request_url;
        this.current_index = 0;
        this.excerpts_per_request = excerpts_per_request;
    }

    async nextReq(lastId:string) {
        if(this.current_index == undefined || this.alreadyReqd[lastId] == true) 
            return;
        console.log("---------------- REQUESTING ---------------------")
        this.alreadyReqd[lastId+""] = true;
        let keyURLs:{ [key: string]: any } = {};
        let next_index = this.current_index + this.excerpts_per_request <= this.msgpackIds.length ? this.current_index + this.excerpts_per_request : undefined;
        let sub_arr = this.msgpackIds.slice(this.current_index, next_index);
        sub_arr.forEach(f => {
            if(succeeded[f] == null) {
                keyURLs[f] = this.request_url+f+".json"
            }}
        );
        if(sub_arr.length == 0) {
            this.current_index = next_index;
            return;
        }
        console.log("embedding: " + sub_arr);
        let prevIndex = this.current_index;
        this.current_index = next_index;
        let strArr = JSON.stringify(keyURLs);
        let req = {
            query_texts: "[]",
            excerpt_files : strArr,
            batchtoken_max: 250};
        let reqRes = await replicateRequest(req);
    }
}



const r = new RepRequester("https://eron.ccrdev.us:3000?get_file=", PREPROCESSED_DIRECTORY, 15);
r.current_index = 0;
//r.nextReq("0");
console.log("req done");