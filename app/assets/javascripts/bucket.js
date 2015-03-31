/**
 * Stolen shamelessly from:
 * ZeroBin 0.19
 *
 * @link http://sebsauvage.net/wiki/doku.php?id=php:zerobin
 * @author sebsauvage
 */

// Immediately start random number generator collector.
sjcl.random.startCollectors();

/**
 *  Converts a duration (in seconds) into human readable format.
 *
 *  @param int seconds
 *  @return string
 */
function secondsToHuman(seconds)
{
    if (seconds<60) { var v=Math.floor(seconds); return v+' second'+((v>1)?'s':''); }
    if (seconds<60*60) { var v=Math.floor(seconds/60); return v+' minute'+((v>1)?'s':''); }
    if (seconds<60*60*24) { var v=Math.floor(seconds/(60*60)); return v+' hour'+((v>1)?'s':''); }
    // If less than 2 months, display in days:
    if (seconds<60*60*24*60) { var v=Math.floor(seconds/(60*60*24)); return v+' day'+((v>1)?'s':''); }
    var v=Math.floor(seconds/(60*60*24*30)); return v+' month'+((v>1)?'s':'');
}


/**
 * Converts a string to an associative array.
 *
 * @param string parameter_string String containing parameters
 * @return object
 */
function parameterStringToHash(parameterString)
{
  var parameterHash = {};
  var parameterArray = parameterString.split("&");
  for (var i = 0; i < parameterArray.length; i++) {
    //var currentParamterString = decodeURIComponent(parameterArray[i]);
    var pair = parameterArray[i].split("=");
    var key = decodeURIComponent(pair[0]);
    var value = decodeURIComponent(pair[1]);
    parameterHash[key] = value;
  }
  
  return parameterHash;
}

/**
 * Get an associative array of the parameters found in the anchor
 *
 * @return object
 **/
function getParameterHash()
{
  var hashIndex = window.location.href.indexOf("#");
  if (hashIndex >= 0) {
    return parameterStringToHash(window.location.href.substring(hashIndex + 1));
  } else {
    return {};
  } 
}

/**
 * Compress a message (deflate compression). Returns base64 encoded data.
 *
 * @param string message
 * @return base64 string data
 */
function compress(message) {
    return Base64.toBase64( RawDeflate.deflate( Base64.utob(message) ) );
}

/**
 * Decompress a message compressed with compress().
 */
function decompress(data) {
    return Base64.btou( RawDeflate.inflate( Base64.fromBase64(data) ) );
}

/**
 * Compress, then encrypt message with key.
 *
 * @param string key
 * @param string message
 * @return encrypted string data
 */
function zeroCipher(key, message) {
    return sjcl.encrypt(key,compress(message));
}
/**
 *  Decrypt message with key, then decompress.
 *
 *  @param key
 *  @param encrypted string data
 *  @return string readable message
 */
function zeroDecipher(key, data) {
    return decompress(sjcl.decrypt(key,data));
}

/**
 * @return the paste unique identifier from the URL
 *   eg. 'c05354954c49a487'
 */
function pasteID() {
    return window.location.search.substring(1);
}

function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/**
 * Set text of a DOM element (required for IE)
 * This is equivalent to element.text(text)
 * @param object element : a DOM element.
 * @param string text : the text to enter.
 */
function setElementText(element, text) {
    // For IE<10.
    if ($('div#oldienotice').is(":visible")) {
        // IE<10 does not support white-space:pre-wrap; so we have to do this BIG UGLY STINKING THING.
        var html = htmlEntities(text).replace(/\n/ig,"\r\n<br>");
        element.html('<pre>'+html+'</pre>');
    }
    // for other (sane) browsers:
    else {
        element.text(text);
    }
}

function showStatus(msg, spin) {
  setElementText($('#status'), msg);
  $('#status').show();
}

/**
 *  Send a new paste to server
 */
function submitPaste() {
    // Do not send if no data.
    if ($('textarea#message').val().length == 0) {
        return;
    }

    // If sjcl has not collected enough entropy yet, display a message.
    if (!sjcl.random.isReady())
    {
        showStatus('Sending paste (Please move your mouse for more entropy)...', spin=true);
        sjcl.random.addEventListener('seeded', function(){ submitPaste(); }); 
        return; 
    }
    
    showStatus('Sending paste...'); // # , spin=true);

    var randomkey = sjcl.codec.base64.fromBits(sjcl.random.randomWords(8, 0), 0);
    $('#encryption_key').val(randomkey);
    var pt_message = $('textarea#message').val();
    var cipherdata = zeroCipher(randomkey, pt_message);
    var burnkey_value = sjcl.codec.base64.fromBits(sjcl.hash.sha256.hash(compress(pt_message)));
    $('#burnkey').val(burnkey_value);
    $('#ciphermessage').val(JSON.stringify(cipherdata));
    var create_paste_form = $('#create_paste_form');
    $.ajax({
	    url: create_paste_form.attr('action'),
	    type: "POST",
	    contentType: "application/x-www-form-urlencoded; charset=utf-8",
	    data: create_paste_form.serialize()
    });
}

/**
 *  Send a new paste to server
 */
function send_data() {
	// Do not send if no data.
	if ($('textarea#message').val().length == 0) {
		return;
	}

	// If sjcl has not collected enough entropy yet, display a message.
	if (!sjcl.random.isReady())
	{
		showStatus('Sending paste (Please move your mouse for more entropy)...', spin=true);
		sjcl.random.addEventListener('seeded', function(){ send_data(); }); 
		return; 
	}

	showStatus('Sending paste...', spin=true);

	var randomkey = sjcl.codec.base64.fromBits(sjcl.random.randomWords(8, 0), 0);
	var cipherdata = zeroCipher(randomkey, $('textarea#message').val());
	var data_to_send = { data:           cipherdata,
		expire:         $('select#pasteExpiration').val(),
		burnafterreading: $('input#burnafterreading').is(':checked') ? 1 : 0,
		opendiscussion: $('input#opendiscussion').is(':checked') ? 1 : 0,
		syntaxcoloring: $('input#syntaxcoloring').is(':checked') ? 1 : 0
	};
	$.post(postLocation(), data_to_send, 'json')
		.error(function() {
			showError('Data could not be sent (serveur error or not responding).');
		})
	.success(function(data) {
		if (data.status == 0) {
			stateExistingPaste();
			var url = postLocation() + "?" + data.id + '#' + randomkey;
			var deleteUrl = postLocation() + "?pasteid=" + data.id + '&deletetoken=' + data.deletetoken;
			showStatus('');

			$('div#pastelink').html('Your paste is <a id="pasteurl" href="' + url + '">' + url + '</a> <span id="copyhint">(Hit CTRL+C to copy)</span>');
			$('div#deletelink').html('<a href="' + deleteUrl + '">Delete link</a>');
			$('div#pasteresult').show();
			selectText('pasteurl'); // We pre-select the link so that the user only has to CTRL+C the link.

			setElementText($('div#cleartext'), $('textarea#message').val());
			urls2links($('div#cleartext'));

			// FIXME: Add option to remove syntax highlighting ?
			if ($('input#syntaxcoloring').is(':checked')) applySyntaxColoring();

			showStatus('');
		}
		else if (data.status==1) {
			showError('Could not create paste: '+data.message);
		}
		else {
			showError('Could not create paste.');
		}
	});
}

/** Return raw text
*/
function rawText()
{
	var paste = $('div#cleartext').html();
	var newDoc = document.open('text/html', 'replace');
	newDoc.write('<pre>'+paste+'</pre>');
	newDoc.close();
}

/**
 * Display an error message
 * (We use the same function for paste and reply to comments)
 */
function showError(message) {
	$('div#status').addClass('errorMessage').text(message);
	$('div#replystatus').addClass('errorMessage').text(message);
}

/**
 * Convert URLs to clickable links.
 * URLs to handle:
 * <code>
 *     magnet:?xt.1=urn:sha1:YNCKHTQCWBTRNJIV4WNAE52SJUQCZO5C&xt.2=urn:sha1:TXGCZQTH26NL6OUQAJJPFALHG2LTGBC7
 *     http://localhost:8800/zero/?6f09182b8ea51997#WtLEUO5Epj9UHAV9JFs+6pUQZp13TuspAUjnF+iM+dM=
 *     http://user:password@localhost:8800/zero/?6f09182b8ea51997#WtLEUO5Epj9UHAV9JFs+6pUQZp13TuspAUjnF+iM+dM=
 * </code>
 *
 * @param object element : a jQuery DOM element.
 * @FIXME: add ppa & apt links.
 */
function urls2links(element) {
	var re = /((http|https|ftp):\/\/[\w?=&.\/-;#@~%+-]+(?![\w\s?&.\/;#~%"=-]*>))/ig;
	element.html(element.html().replace(re,'<a href="$1" rel="nofollow">$1</a>'));
	var re = /((magnet):[\w?=&.\/-;#@~%+-]+)/ig;
	element.html(element.html().replace(re,'<a href="$1">$1</a>'));
}

/**
 * Return the deciphering key stored in anchor part of the URL
 */
function pageKey() {
	var key = window.location.hash.substring(1);  // Get key

	// Some stupid web 2.0 services and redirectors add data AFTER the anchor
	// (such as &utm_source=...).
	// We will strip any additional data.

	// First, strip everything after the equal sign (=) which signals end of base64 string.
	i = key.indexOf('='); if (i>-1) { key = key.substring(0,i+1); }

	// If the equal sign was not present, some parameters may remain:
	i = key.indexOf('&'); if (i>-1) { key = key.substring(0,i); }

	// Then add trailing equal sign if it's missing
	if (key.charAt(key.length-1)!=='=') key+='=';

	return key;
}
$(function() {
	$("#submit_paste").click(function() {
		submitPaste();
		return false;
	});
});
