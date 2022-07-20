const axios = require('axios').default;


function extractTrackingInformation(result) {
    if(!result.form_data) return false;

    const { utm_content = '', utm_source = '', utm_campaign = '', dg_track = '', utm_medium = '', utm_term = '' } = result.form_data;

    return { utm_content, utm_source, utm_campaign, utm_term, utm_medium, dg_track };
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


module.exports = { extractTrackingInformation, reduceTrackingInformation, handleCampaignLogPagination, sumMergeObjects, sumTrackingInformation };

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
