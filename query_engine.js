const await = require('await')
const mongoose = require('mongoose');
const { exit } = require('process');
const { log } = require('console');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs')
const path=require('path');
const ejs = require('ejs');
const port=8000;

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.set('views', path.join(__dirname,'public'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname,'public')));

app.use(express.urlencoded({extended: true}));
app.use(express.json());


var mongoDB = 'mongodb://localhost/search_engine';
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection.on('error', (err) => {
    console.log("DB Connection Error");
});

mongoose.connection.on('connected', (err) => {
    console.log("DB connected Successfully");
});

var Schema = mongoose.Schema;

var indexer_schema = Schema({
    word : String,
    info : [{url : String, priority : Number}]
});

var indexerDetails = mongoose.model("indexer_details", indexer_schema, "indexerDetails");


excludedWords=[]
getExcludedWords()

async function getExcludedWords(){
    var words=[]
    var read_file = fs.readFileSync('Excluded Words.txt','utf-8')
    words=read_file.split('\n')
    for (word of words){
        excludedWords.push(word)
    }
    return excludedWords;
}

app.get('/',function(req,res){

    res.render('\index')

})

async function getLinks(word){

    query=indexerDetails.findOne({word:word},{info:1})
    result = await query.exec()
    if(result == null)
        return []

    ret = []
    //console.log(result.length)
    for(let i=0;i<result.info.length;i++)
    {
        //very important to flip priority
        ret.push({url:result.info[i].url,priority:Math.abs(result.info[i].priority-9)})
    }
    return ret

}

app.get('/result',async function(req,res){

    console.log(req.query)
    const query = req.query.query
    var query_words_raw=query.match(/\b(\w+)\b/g)
    query_words=[]
    query_words_raw.forEach(word=>{
        if(!excludedWords.includes(word)) {
            query_words.push(word.toLowerCase())
        }
    })
    links_raw=[]
    for(let i =0 ;i<query_words.length;i++){

        word=query_words[i]
        //console.log(word)
        wordLinks = await getLinks(word)
        wordLinks.forEach(link=>{
            links_raw.push(link)
        })
    }
    links=[]
    for(let i=0;i<links_raw.length;i++)
    {
        url=links_raw[i].url
        priority=links_raw[i].priority
        //console.log(url,priority)
        index = await links.findIndex(info=>info.url==url)
        if(index>=0)
        {
            //console.log("add")
            links[index].priority+=priority
        }
        else{
            //console.log("push")
            links.push({url:url,priority:priority})
        }
    }
    links.sort((a,b) => (a.priority < b.priority) ? 1 : ((b.priority < a.priority) ? -1 :0))

    //console.log(links)
    res.render('result',{query:query,links:links.slice(0,50)})

})

app.listen(process.env.PORT || port,()=>{console.log("Listening on port "+port);});