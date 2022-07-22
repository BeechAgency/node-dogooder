const axios = require('axios').default;


function extractTrackingInformation(result) {
    if(!result.form_data) return false;

    const { utm_content = '', utm_source = '', utm_campaign = '', dg_track = '', utm_medium = '', utm_term = '' } = result.form_data;

    return { utm_content, utm_source, utm_campaign, utm_term, utm_medium, dg_track };
}


function extractDGTrackWithDate(result) {
    if(!result.form_data) return false;

    const { dg_track = '' } = result.form_data;

    const date = new Date(result.created).toISOString().split('T')[0];

    return { dg_track, date };
}

const sumMergeObjects = data => {
    const result = {}; //(1)
  
    data.forEach(basket => { //(2)
      for (let [key, value] of Object.entries(basket)) { //(3)
        if (result[key]) { //(4)
          result[key] += value; //(5)
        } else { //(6)
          result[key] = value;
        }
      }
    });
    return result; //(7)
  };

function sumTrackingInformation(data) {
    const params = ['utm_content', 'utm_source', 'utm_campaign', 'utm_term', 'utm_medium', 'dg_track'];
    const tracking = {};

    params.forEach( param => {
        tracking[param] = {};
    });
    
    // Merging the datas together, so loop through the data
    data.forEach( page => {
        params.forEach( param => {
            // If the param doesn't exist already bail.
            if(!page[param]) return;
            const counts = page[param].counts;

            for (let [key, value] of Object.entries( counts  )  ) {
                //console.log(key, value);
                if(isNaN(tracking[param][key])) {
                    tracking[param][key] = value;
                } else {
                    tracking[param][key] += value;
                }
            }
        });
    })

    return tracking;
}


function reduceTrackingInformation( data = [], results = {} ) {
    const params = ['utm_content', 'utm_source', 'utm_campaign', 'utm_term', 'utm_medium', 'dg_track'];
    
    // Set up the results object.
    params.forEach( param => {
        // If the results object has been set up previously BAIL!
        if(results.hasOwnProperty(param)) return;

        results[param] = { values: [], counts : {} }
    });
    /*
    {
        "utm_content": "",
        "utm_source": "Christians United for Afghanistan",
        "utm_campaign": "ee5ffe2fd5-EMAIL_CAMPAIGN_2022_03_26_03_20",
        "utm_term": "0_3307caeef2-ee5ffe2fd5-513065065",
        "utm_medium": "email",
        "dg_track": ""
      },
    */
    data.forEach( item => {
        params.forEach( param => {
            const results_item = results[param];
            let item_value = item[param];

            item_value = item_value === '' ? 'na' : item_value;

            // If the value exists already count it
            if(results_item.values.includes(item_value)) {
                results_item.counts[item_value] += 1;
                return;
            }
            
            // If it doesn't exist push it into the values array and start the count
            results_item.values.push(item_value);
            results_item.counts[item_value] = 1;

            return;
        });

        return;
    });
    
    return results;
}

function summarizeDgTrackByDate(data) {
    const params = ['dg_track', 'date'];

    const dates = [];
    const dg_track_values = [];

    data.forEach( item => {
        if(!dates.includes(item.date))  dates.push(item.date);
        if(!dg_track_values.includes(item.dg_track))  dg_track_values.push(item.dg_track);
    });

    const output = [];

    dates.forEach( date => {
        let record = {};
        record.date = date;
        record.results = {};
        record.total = 0;

        // Count the results for each date
        data.forEach( item => {
            if(item.date !== date) return;

            const dg = item.dg_track;

            record.total++;

            if( record.results.hasOwnProperty(dg) ) {
                record.results[dg]++;

                return;
            }

            record.results[dg] = 1;
        });

        output.push(record);
    });

    return output;
}

async function getCampaignLog(url, config) {
    return await axios.get(url ,config)
    .then( function( response ) {
        console.log('OK: ', response);

        const results = response.data.results;

        return {
            status: response.status,
            data: results,
            count : response?.data?.count
        };
    })
    .catch( function( error ) {
        console.error('ERROR: ', error?.response?.status);
    });
}



async function getCampaignLogByDay(url, config, date = '2021-07-01', page = 1) {
    const date_obj = new Date(date);

    const timestamp = date_obj.toISOString();

    let req_url = `${url}&since=${timestamp}&ordering=created${page > 1 ? '&page='+page : ''}`;
    //if(url.includes('?')) req_url = url; // Params included when making a next request

    return await axios.get( req_url, config)
    .then( response => response.data )
    .then( data => {
        //console.log('OK: ', data);

        const results = data.results;
        const tracking = [];

        results.forEach( result => {
            tracking.push(extractDGTrackWithDate(result));
        });

        const summary = summarizeDgTrackByDate(tracking);

        let next = 0;
        if(data.next) {
            const next_url = data.next;
            const query_string = next_url.split('?')[1];        
            const search_params = new URLSearchParams(query_string);

            next = search_params.get('page');
        }

        //console.log(data.next);

        return {
            status: data.status,
            data: summary,
            count : data?.count,
            next : next
        };

    })
    .catch( function( error ) {
        console.error('ERROR: ', error);
    });
}





async function handleCampaignLogPagination(url, config, data) {
    data = data || {};

    if( typeof(data.status) !== 'object' ) data.status = [];
    if( typeof(data.data) !== 'object' ) data.data = [];
    if( typeof(data.count) !== 'object' ) data.count = [];


    const request_axios = await axios.get(url, config).then( function( response ) {
        //console.log('OK: ', response);

        const tracking = [];
        const results = response?.data?.results;
        const next_page = response?.data?.next;

        results.forEach( (result) => {
            tracking.push( extractTrackingInformation(result) )

            return;
        });

        const tracking_results = reduceTrackingInformation(tracking);

        data.status.push(response.status);
        data.data.push(tracking_results);
        data.count.push(response?.data?.count);

        if(next_page) {
            return handleCampaignLogPagination(next_page, config, data);
        }
    })
    .catch( function( error ) {
        console.error('ERROR: ', error?.response?.status);
    });

    return data;

}


module.exports = { extractTrackingInformation, reduceTrackingInformation, handleCampaignLogPagination, sumMergeObjects, sumTrackingInformation, getCampaignLog, getCampaignLogByDay };

/*
fetch('https://hook.us1.make.com/r9h7lqvpp7vhfjzlopqo3tugf8giu829', {
    method: 'POST',
    body: JSON.stringify({
        data1: 'blah',

        data2: 'blah2',
        arr : [1,2,3,4]
    }),
    headers: {
        'Content-type': 'application/json; charset=UTF-8',
        }
    })
  .then(function(response){ 
    console.log(response)}).catch(error => console.error('Error:', error)); 

*/



/*

async function getData() {
    const data = await fetch('https://api.fightfamine.com.au/.netlify/functions/get_results', { method : 'GET' })
              .then(response => response.json() )
              .then(data => return data.request.results);
              
      return data;
}




async function getData() {
    const data = await fetch('https://api.fightfamine.com.au/.netlify/functions/get_results', { method : 'GET' })
              .then(response => response.json() )
              .then(data => return data.request.results);
              
      return data;
}

async function fillTable() {
        const el = document.getElementById('output');
    const loader = document.getElementById('output-loader');
    
    loader.style.display = 'block';
    
    let loading = true;

    const data = await getData();

    let output = '<div>';

    for (let [key, value] of Object.entries( data )  ) { 
        output += '<div class="param-group">'+key;
        
        for (let [key2, value2] of Object.entries( value )  ) { 
            //console.log(key, value, key2, value2) 
            output += '<div class="param-key">'+key2+'</div><div class="param-result">'+value2+'</div>';
        } 
        output += '</div>';
    } 

    output += '</div>';

    loading = false;
    
    el.innerHTML = output;
    
    return;
}*/