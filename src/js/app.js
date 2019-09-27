// Define a variable to store the ID of the currently played track
let iPlaylist = 0;

// Define a vriable to store the mouse coordinates
let mousePosition = {};

// Store the OpenWeatherMap API token
let owmToken = '';

let contentHeight;

$.ajax({
  url: './settings/ip.txt',
  method: 'GET'
}).done((ip) => {
  //Websocket connection
  const socket = io.connect(`http://${ip}:8080`);

  // Get the background image from the settings and add it to the page
  $.ajax({
    url: './settings/settings.json',
    method: 'GET',
    dataType: 'json'
  }).done(settings => {
    if (settings.backgroundImage !== undefined) {
      $.ajax({
        url: settings.backgroundImage,
        method: 'GET',
        dataType: '',
        statusCode: {
          200: () => {
            $('#backgroundImage')
              .css('background-image', `url(${settings.backgroundImage})`);
          },
          404: () => {
            $('#msgContainer').text('Sorry, your background image couldn\'t be loaded... Maybe try another one')
            fade('#msgContainer');
          }
        }
      });
    }

    if (settings.owmToken !== undefined) {
      owmToken = settings.owmToken;
      $('.owmToken__Comment').text(`Your OpenWeatherMap token is ${owmToken}. You can update it here !`);
    }
  });

  // Design the content divs
  const addContent = (parent, element) => {
    let svg = `${parent} ${element} .blank`;
    contentHeight = $('.content').height();

    if (!$(`${element} .rssContainer`).length && !$(`${element} .forecast`).length) {
      $(element)
        .mouseenter(() => {
          $(svg)
            .addClass('flex visible')
            .removeClass('invisible');
        })
        .mouseleave(() => {
          $(svg)
            .addClass('invisible')
            .removeClass('visible');
        });
    }

    // Show the "addContent" form on svg click
    $(svg).click(() => {
      $(element).css('padding', '0');

      $(`${parent} ${element} .addContent`).addClass('flex');
      $(svg).hide();
      $(element)
        .mouseenter(() => {
          // Only show the 'blank' div if the addContent div is hidden
          if ($(`${parent} ${element} .addContent`).is(':visible')) {
            $(svg).hide();
          }
        });

      $(`${parent} ${element} .addContent`).ready(() => {
        // Add RSS on form "addContent" submit

        // Handle option selection
        $(`${parent} ${element} .addContent__select`).on('change', () => {

          $(`${parent} ${element} .addContent__btnContainer`).css('display', 'inline-flex');

          // If the feed option is selected, handle the adding
          if ($(`${parent} ${element} .addContent__select`).val() === 'Add a feed') {

            $(`${parent} ${element} .addContent`).removeClass('menu');

            $(`${parent} ${element} .addContent__select`).addClass('select');

            $(`${parent} ${element} .addContent__feed`)
              .css('display', '')
              .addClass('flex');

            // Hide uneccesary elements
            if ($(`${parent} ${element} .addContent__weather:visible`).length) {
              $(`${parent} ${element} .addContent__weather`).hide();
            }

            // Add RSS feed on form submit
            $(`${parent} ${element} .addContent__submitBtn`)
              .click(() => {
                // Call a server-side function to parse the feed if the url isn't null or undefined
                if ($(`${parent} ${element} .addContent__feed__input`).val() !== null && $(`${parent} ${element} .addContent__feed__input`).val() !== undefined && $(`${parent} ${element} .addContent__feed__input`).val() !== '') {
                  // Ask the server to parse the feed
                  socket.emit('add content', [{
                    element: element,
                    parent: parent,
                    url: $(`${parent} ${element} .addContent__feed__input`).val(),
                    type: 'rss',
                    new: false
                  }]);
                } else {
                  printError(`Bad RSS feed URL`);
                }

                // Add content to the page
                parseContent();

                $(`${parent} ${element} .addContent`).hide();
              });
          } else if ($(`${parent} ${element} .addContent__select`).val() === 'Weather forecast') {

            $(`${parent} ${element} .addContent`).removeClass('menu');

            $(`${parent} ${element} .addContent__select`).addClass('select');

            if ($(`${parent} ${element} .addContent__feed:visible`).length) {
              $(`${parent} ${element} .addContent__feed`).hide();
            }

            $(`${parent} ${element} .addContent__weather`)
              .css({
                justifyContent: 'center',
                alignItems: 'center',
                display: ''
              })
              .addClass('flex');

            // Search for weather forecast on form submit
            $(`${parent} ${element} .addContent__submitBtn`)
              .click(() => {
                $.ajax({
                  url: `https://api.openweathermap.org/data/2.5/find?q=${$(`${parent} ${element} .addContent__weather__input`).val()}&units=metric&lang=en&appid=${owmToken}`,
                  method: 'POST',
                  dataType: 'json',
                  statusCode: {
                    401: () => {
                      displayWeatherError(element);
                    },
                    200: (forecast => {

                      // Add content to the page
                      parseContent();

                      // Send the changes to the server side
                      socket.emit('add content', [{
                        element: element,
                        parent: parent,
                        location: $(`${parent} ${element} .addContent__weather__input`).val(),
                        type: 'weather',
                        new: false
                      }]);
                    })
                  }
                });
              });
          } else {
            $(`${parent} ${element} .addContent`).addClass('menu');
            $(`${parent} ${element} .addContent__select`).removeClass('select');
            $(`${parent} ${element} .addContent__feed, ${parent} ${element} .addContent__weather, ${parent} ${element} .addContent__btnContainer`).hide();
          }
        });

        // Cancel new content adding
        $(`${parent} ${element} .addContent__cancelBtn`).click(() => {
          $(`${parent} ${element} .addContent`).hide();
          $(svg).show();
        });
      });
    });
  }

  const addContentOptions = (element) => {
    contentHeight = $('.content').height();

    const removeContent = (parent, element2remove, child) => {
      if ($(element2remove).length) {
        $(child)
          .mouseenter(() => {
            // Show the removeContentBtn on feedtitle hover
            $(`${parent} .contentOptions`).css('display', 'flex');
          })
          .mouseleave(() => {
            $(`${parent} .contentOptions`).hide();
          });

        // Remove feed on button click
        $(`${parent} .removeContentBtn`).click(() => {
          $(element2remove).remove();

          if (!$(element2remove).length) {
            $(parent)
              .css({
                height: contentHeight
              });

            $(`${parent} .blank`)
              .css({
                height: contentHeight
              })
              .addClass('flex');
          }

          addContent(`.${$(parent).parent().attr('class').match(/content\d__container/)}`, `.${$(parent).attr('class').match(/content\d{1,}/)}`);
        });
      }
    }
    const updateContent = (parent, element, child) => {
      if ($(element).length) {
        $(child)
          .mouseenter(() => {
            // Show the removeContentBtn on content title hover
            $(`${element} .contentOptions`).addClass('flex');
          })
          .mouseleave(() => {
            $(`${element} .contentOptions`).hide();
          });

        $(`${element} .updateContentBtn`).click(() => {

          // Update RSS
          if (element.match(/rss/i)) {
            socket.emit('update feed', {
              element: element
            });

            socket.on('rss parsed', (parsedData) => {
              console.log('update');
              parseContent(parsedData.element);
            });
          } else if (element.match(/forecast/i)) {
            // Remove the "Weather in..." part of the title to extract the location
            let location = $('.forecast__header__title').text().split(' ');
            location.splice(0, 2);
            location = location[0];
            $.ajax({
              url: `https://api.openweathermap.org/data/2.5/find?q=${location}&units=metric&lang=en&appid=${owmToken}`,
              method: 'POST',
              dataType: 'json',
              statusCode: {
                401: () => {
                  displayWeatherError(parent);
                },
                200: (forecast => {
                  // Retrieve the updated data

                  // Format the forecast summary to get the first letter uppercase
                  let tempDescription = forecast.list[0].weather[0].description.split('');
                  let firstLetter = tempDescription[0].toUpperCase();
                  tempDescription.shift();
                  tempDescription.unshift(firstLetter);

                  tempDescription = tempDescription.join('');

                  let previsions = {
                    temp: forecast.list[0].main.temp,
                    city: forecast.list[0].name,
                    description: tempDescription,
                    humidity: forecast.list[0].main.humidity,
                    windSpeed: forecast.list[0].wind.speed,
                    weatherIcon: forecast.list[0].weather[0].icon
                  };

                  // Add content to the page
                  $('.forecast__content__info__description__desc').text(previsions.description);
                  $('.forecast__content__info__temp__desc').text(`${previsions.temp} °C`);
                  $('.forecast__content__info__wind__desc').text(`${previsions.windSpeed} km/h`);
                  $('.forecast__content__info__humidity__desc').text(`${previsions.humidity} %`);

                  updateWeatherIcon(previsions);
                })
              }
            });
          }
        });
      }
    }

    $(`${element} .rssContainer`).ready(() => {
      removeContent(element, `${element} .rssContainer`, `${element} .rssContainer__header`);
      updateContent(element, `${element} .rssContainer`, `${element} .rssContainer__header`);
    });

    $(`${element} .forecast`).ready(() => {
      removeContent(element, `${element} .forecast`, `${element} .forecast__header`);
      updateContent(element, `${element} .forecast`, `${element} .forecast__header`);
    });
  }

  const autocomplete = (search) => {
    let matches = suggestions.filter(suggestion => {
      const regex = new RegExp(`^${search}`, 'gi');
      return suggestion.label.match(regex);
    });

    // Prevent suggestions if the input is empty
    if (!search.length) {
      matches = [];
      $('.suggestions').text('');
      $('.formContainer')
        .css({
          borderRadius: '30px',
          padding: '0.5% 1%'
        });

      $('.suggestions').removeClass('active');
    }

    if (matches !== [] && search.length >= 2 && search.startsWith('!')) {
      $('.formContainer')
        .css({
          borderRadius: '30px 30px 0 0',
          paddingBottom: 0
        });

      if (!$('.suggestions').hasClass('active')) {
        $('.suggestions').addClass('active');
      }

      $('.suggestions')
        .css({
          width: $('.formContainer').innerWidth()
        });

      // Check if matches are not null
      if (matches !== [] && matches.length > 0) {
        const html = matches.map(match => `
            <div class="suggestion flex">
              <img class="suggestion__icon" src="${match.icon}" alt="${match.desc} icon" height="20px" />
              <span class="suggestion__label">${match.label}</span>
              <span class="suggestion__desc">${match.desc}</span>
            </div>
            `)
          .join('');

        $('.suggestions').html(html);
        $('.suggestion').click((event) => {
          let nodevalue;
          let target = event.target;
          if (target.className === 'suggestion__label') {
            nodevalue = target.textContent;
          } else if (target.className === 'suggestion__icon') {
            nodevalue = target.nextElementSibling.textContent;
          } else if (target.className === 'suggestion__desc') {
            nodevalue = target.previousElementSibling.textContent;
          } else if (target.className === 'suggestion') {
            nodevalue = target.children[1].textContent;
          }

          if (nodevalue) {
            $('#questionBox')
              .val(`${nodevalue} `)
              .focus();
          }
        });
      } else {
        $('.suggestions').removeClass('active');
      }
    }
  }

  const displaySvg = (data) => {
    // Playlist controls

    if (data.videos[iPlaylist] !== undefined) {
      if (iPlaylist < data.videoCount) {
        if (iPlaylist === 0) {
          $('.player__leftSvg').hide();
        }

        $('.player__rightSvg')
          .click(() => {
            iPlaylist++;
            if (iPlaylist < data.videoCount && data.videos[iPlaylist] !== undefined) {
              $('#audioSrc').attr('src', `https://www.invidio.us/latest_version?id=${data.videos[iPlaylist].videoId}&itag=251&local=true`);
              document.getElementById('audio__player').load();
              $('#streamTitle').text(data.videos[iPlaylist].title);
              $('#YtId').text(` (Youtube ID : ${data.videos[iPlaylist].videoId})`);
              $('.playlistInfo').text(`${iPlaylist + 1}/${data.videoCount}`);

              if (iPlaylist > 0) {
                $('.player__leftSvg')
                  .show();
              }

              if (iPlaylist === data.videoCount - 1) {
                $('.player__rightSvg').hide();
              }
            }
          });

        $('.player__leftSvg')
          .click(() => {
            if (iPlaylist > 0) {
              iPlaylist--;
              $('#audioSrc').attr('src', `https://www.invidio.us/latest_version?id=${data.videos[iPlaylist].videoId}&itag=251&local=true`);
              document.getElementById('audio__player').load();
              $('#streamTitle').text(data.videos[iPlaylist].title);
              $('#YtId').text(` (Youtube ID : ${data.videos[iPlaylist].videoId})`);
              $('.playlistInfo').text(`${iPlaylist + 1}/${data.videoCount}`);
            }

            if (iPlaylist === 0) {
              $('.player__leftSvg').hide();
            } else if (iPlaylist > 0) {
              $('.player__rightSvg').show();
            }
          });
      } else {
        $('.player__rightSvg').show();
      }
    }
  }

  const displayUploadWarning = (text) => {
    let warning = $('<b></b>');
    warning
      .text(text)
      .addClass('warning');
    $('#backgroundImageUploadForm').after(warning);
  }

  const displayWeatherError = (parsedElement) => {
    let warningMsg = 'Sorry dude, your OpenWeatherMap token is invalid 😢. Please modify it in the settings.';
    if ($('.addContent:visible').length) {
      if (!$('.addContent .warning').length) {
        let warning = $('<span></span>');
        warning
          .addClass('warning')
          .text(warningMsg)
          .appendTo($('.addContent__weather'));
      }
    } else {
      // Prevent duplicates
      if (!$(`${parsedElement} .warning`).length) {
        let errorMsg = $('<span></span>');
        errorMsg
          .addClass('warning')
          .css({
            marginTop: 0,
            alignItems: 'center'
          })
          .text(warningMsg)
          .appendTo(parsedElement);
      }
    }
  }

  const fade = (element) => {
    $(element).fadeIn(2000, () => {
      setTimeout(() => {
        $(element).fadeOut(2000);
      }, 5000);
    });
  }

  const getMousePosition = () => {
    $(window).mousemove((event) => {
      mousePosition.x = event.pageX;
      mousePosition.y = event.pageY;
    });
  }

  const listen2Playlist = (data) => {
    $('.audio').addClass('flex');

    $('.player__leftSvg, .player__rightSvg').off();

    // Remove the player on delete button click
    removeAudioPlayer();

    if (data.videos[iPlaylist] === undefined) {
      printError('Invalid playlist reference !');
    } else {
      if (iPlaylist < data.videoCount && !data.videos[iPlaylist].title.match(/deleted video/gi) && data.videos[iPlaylist] !== undefined) {
        // Adapt the #moreContent height so all the elements can fit on the page
        $('.moreContent').height('60%');

        // Define the audio player
        if (!$('.audio__player').length) {
          let audioPlayer = $('<audio></audio>');
          audioPlayer.attr({
              id: 'audio__player',
              controls: 'controls',
              autoplay: 'autoplay'
            })
            .addClass('audio__player')
            .text('Your browser does not support the audio element :(')
            .appendTo('.player');

          let leftSvg = $('<svg class="player__leftSvg" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>');
          leftSvg
            .prependTo('.player');

          let rightSvg = $('<svg class="player__rightSvg" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>');
          rightSvg
            .appendTo('.player');

          // Define the source tag
          let audioSrc = $('<source>');
          audioSrc.attr({
              id: 'audioSrc',
              src: `https://www.invidio.us/latest_version?id=${data.videos[iPlaylist].videoId}&itag=251&local=true`,
              type: ' audio/mpeg',
            })
            .appendTo('.audio__player');
        } else {
          $('#audioSrc').attr('src', `https://www.invidio.us/latest_version?id=${data.videos[iPlaylist].videoId}&itag=251&local=true`);

          // Add playlist controls if they do not exist
          if (!$('.player__leftSvg').length) {
            let leftSvg = $('<svg class="player__leftSvg" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>');
            leftSvg
              .hide()
              .prependTo('.player');

            let rightSvg = $('<svg class="player__rightSvg" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>');
            rightSvg
              .hide()
              .appendTo('.player');
          }

          $('.streamInfoContainer, .player, .playlistInfo, .player__leftSvg, .player__rightSvg').show();
          $('.playlistEndMsg').hide();
        }

        // If the info about the track are not displayed, add them
        if (!$('.streamInfoContainer').length) {
          let playlistInfo = $('<span></span>');
          playlistInfo
            .addClass('playlistInfo')
            .text(`${iPlaylist + 1}/${data.videoCount}`)
            .show()
            .prependTo('.audioMsg');

          let streamInfoContainer = $('<span></span>');
          streamInfoContainer
            .addClass('streamInfoContainer')
            .css({
              width: '90%'
            })
            .insertBefore('.audio__remove');

          // Display some info about the played track
          let audioText = $('<span></span>');
          audioText
            .attr('id', 'streamText')
            .text(`You're listening to `)
            .appendTo('.streamInfoContainer');

          let streamTitle = $('<span></span>');
          streamTitle
            .attr('id', 'streamTitle')
            .text(data.videos[iPlaylist].title)
            .appendTo('.streamInfoContainer');

          let streamId = $('<span></span>');
          streamId
            .text(` (Youtube ID : ${data.videos[iPlaylist].videoId})`)
            .attr('id', 'YtId')
            .appendTo('.streamInfoContainer');
        } else {
          $('#streamTitle').text(data.videos[iPlaylist].title);
          $('#YtId').text(` (Youtube ID : ${data.videos[iPlaylist].videoId})`);
          $('streamInfoContainer').css({
            width: '90%'
          });

          if (!$('.playlistInfo').length) {
            let playlistInfo = $('<span></span>');
            playlistInfo
              .addClass('playlistInfo')
              .text(`${iPlaylist + 1}/${data.videoCount}`)
              .show()
              .prependTo('.audioMsg');
          } else {
            $('.playlistInfo')
              .show()
              .text(`${iPlaylist + 1}/${data.videoCount}`);
          }
        }

        // Avoid the Jquery 'load' function and show the audio player
        document.getElementById('audio__player').load();

        document.getElementById('audio__player').onended = () => {
          iPlaylist++;
          if (data.videos[iPlaylist] !== undefined) {
            listen2Playlist(data);
          } else {
            $('.player__rightSvg').hide();

            $('.player, .streamInfoContainer, .playlistInfo').hide();

            if (!$('.endOfPlaylist').length) {
              let endOfPlaylist = $('<span></span>');
              endOfPlaylist
                .text('There is no track left in here... 😭')
                .addClass('playlistEndMsg')
                .prependTo('.audioMsg');
            }

            $('.audioMsg')
              .css('justify-content', 'center');

            fade($('.audio'));
          }
        }

        $('.audio__player').show();
        $('.audioMsg').show();
        $('.audio').fadeIn(1500);

        // Display playlist controls
        displaySvg(data);
      } else if (data.videos[iPlaylist] === undefined) {
        printError('Video ID not found !');
      } else if (data.videos[iPlaylist].title.match(/(deleted video) || (private video)/gi)) {
        iPlaylist++;
        listen2Playlist(data);
      }
    }
  }

  const openUrl = (msg) => {
    let args = msg.split(' ');

    for (let i = 0; i < suggestions.length; i++) {
      if (args[0] === suggestions[i].label) {
        args.shift();
        let keywords = args.join(' ');

        // Check if suggestion URL is not null
        if (suggestions[i].url !== undefined && suggestions[i] !== null) {
          if (suggestions[i].label === '!iv') {
            window.open(`${suggestions[i].url}${keywords}&local=true`);
          } else if (suggestions[i].label === '!pb') {
            window.open(`${suggestions[i].url}${keywords}/-/`);
          } else {
            window.open(`${suggestions[i].url}${keywords}`);
          }
        }
      }
    }

    // Empty the search box and hide the suggestions
    $("#questionBox")
      .val('');

    $('#formContainer')
      .css({
        borderRadius: '30px'
      });

    $('.suggestion').hide();
  }

  // Add content of other types than RSS
  const parseContent = () => {
    socket.on('parse content', (parsedData) => {
      // console.log(JSON.stringify(parsedData, null, 2));
      for (const [i, value] of parsedData.entries()) {
        // console.log(i, `${value.parent} ${value.element}`);
        const buildElement = (parent, element, iElement, callback) => {
          if (!$(element).length) {
            let container = $('<div></div>')
              .addClass(`content content${iElement}`)
              .attr('id', `content${iElement}`);

            if (!$(element).length) {
              container.appendTo(parent);
            }

            $(element).ready(() => {
              if (!$(`${element} .blank`).length && !$(`${element} .addContent`).length) {
                $(element)
                  .prepend(newBlank)
                  .append(newAddContent);
              }
              callback();
            });
          } else {
            callback();
          }
        }

        let parent = value.parent;
        let element = value.element;
        let fullElementClassName = `${value.parent} ${value.element}`;
        let iElement = Number(element.match(/[0-9]{1,}/));
        let newBlank = $(`.blank`).clone()[0];
        let newAddContent = $(`.addContent`).clone()[0];

        buildElement(parent, fullElementClassName, iElement, () => {
          const addNewContentContainer = () => {
            setTimeout(() => {
              if (!$(`${parent} .newContent`).length) {
                let newContainer = $('<div></div>')
                newContainer
                  .addClass(`newContent content subRow flex`)
                  .appendTo(parent)
                  .prepend(newBlank)
                  .append(newAddContent);

                let svg = $(`${parent} .newContent .blank`);
                svg.addClass('flex');

                $(newContainer)
                  .mouseenter(() => {
                    $(svg).css({
                        visibility: 'visible',
                      })
                      .addClass('flex');

                    $(svg).click(() => {
                      $(fullElementClassName)
                        .css('padding', '0');

                      $(svg)
                        .off()
                        .hide();

                      $(`${parent} .newContent .addContent`).addClass('flex');

                      $(`${parent} .newContent`)
                        .mouseenter(() => {
                          // Only show the 'blank' div if the addContent div is hidden
                          if ($(`${parent} .newContent .addContent`).is(':visible')) {
                            // console.log(`${parent} .newContent .addContent`);
                            $(svg).css({
                              display: 'none'
                            });
                          }
                        });

                      $(`${parent} .newContent .addContent`).ready(() => {
                        let iNewElt;
                        const updateClass = () => {
                          // Toggle classes to match a regular pattern
                          iNewElt = Number(newContainer.prev().attr('class').substring(15, 16)) + 1;

                          newContainer
                            .removeClass('newContent')
                            .addClass(`content${iNewElt}`);
                        }

                        // Handle option selection
                        $(`${parent} .newContent .addContent__select`).on('change', () => {

                          $(`${parent} .newContent .addContent__btnContainer`).css('display', 'inline-flex');

                          // If the feed option is selected, handle the adding
                          if ($(`${parent} .newContent .addContent__select`).val() === 'Add a feed') {

                            $(`${parent} .newContent .addContent`).removeClass('menu');

                            $(`${parent} .newContent .addContent__select`).addClass('select');

                            if ($(`${parent} .newContent .addContent__weather:visible`).length) {
                              $(`${parent} .newContent .addContent__weather`).hide();
                            }

                            $(`${parent} .newContent .addContent__feed`).addClass('flex');

                            // Add RSS feed on form submit
                            $(`${parent} .newContent .addContent__submitBtn`)
                              .click(() => {
                                updateClass();

                                $(`${parent} .newContent .addContent`).hide();

                                // Call a server-side function to parse the feed if the url isn't null or undefined
                                if ($(`${parent} .content${iNewElt} .addContent__feed__input`).val() !== null && $(`${parent} .content${iNewElt} .addContent__feed__input`).val() !== undefined && $(`${parent} .newContent .addContent__feed__input`).val() !== '') {
                                  // Ask the server to parse the feed
                                  socket.emit('add content', [{
                                    element: `.content${iNewElt}`,
                                    parent: parent,
                                    url: $(`${parent} .content${iNewElt} .addContent__feed__input`).val(),
                                    type: 'rss',
                                    new: true
                                  }]);
                                } else {
                                  printError(`Bad RSS feed URL`);
                                }

                                // Add content to the page
                                parseContent();
                              });
                          } else if ($(`${parent} .newContent .addContent__select`).val() === 'Weather forecast') {

                            $(`${parent} .newContent .addContent`).removeClass('menu');

                            $(`${parent} .newContent .addContent__select`).addClass('select');

                            if ($(`${parent} .newContent .addContent__feed:visible`).length) {
                              $(`${parent} .newContent .addContent__feed`).hide();
                            }

                            $(`${parent} .newContent .addContent__weather`)
                              .css({
                                justifyContent: 'center',
                                alignItems: 'center'
                              })
                              .addClass('flex');

                            // Search for weather forecast on form submit
                            $(`${parent} .newContent .addContent__submitBtn`)
                              .click(() => {
                                updateClass();

                                $.ajax({
                                  url: `https://api.openweathermap.org/data/2.5/find?q=${$(`${parent} .content${iNewElt} .addContent__weather__input`).val()}&units=metric&lang=en&appid=${owmToken}`,
                                  method: 'POST',
                                  dataType: 'json',
                                  statusCode: {
                                    401: () => {
                                      displayWeatherError(fullElementClassName);
                                    },
                                    200: (forecast => {

                                      // Add content to the page
                                      parseContent();

                                      $(`${parent} .content${iNewElt} .addContent`).hide();
                                      // console.log(`${parent} .content${iNewElt}`);

                                      // Send the changes to the server side
                                      socket.emit('add content', [{
                                        element: `.content${iNewElt}`,
                                        parent: parent,
                                        location: $(`${parent} .content${iNewElt} .addContent__weather__input`).val(),
                                        type: 'weather',
                                        new: true
                                      }]);
                                    })
                                  }
                                })
                              });
                          } else {
                            $(`${parent} .newContent .addContent`).addClass('menu');
                            $(`${parent} .newContent .addContent__select`).removeClass('select');
                            $(`${parent} .newContent .addContent__feed, ${parent} .newContent .addContent__weather, ${parent} .newContent .addContent__btnContainer`).hide();
                          }
                        });

                        // Cancel new content adding
                        $(`${parent} .newContent .addContent__cancelBtn`).click(() => {
                          $(`${parent} .newContent .addContent`).hide();
                          // $(svg)
                          //   .css({
                          //     visibility: 'visible',
                          //     display: 'flex'
                          //   })
                        });
                      });
                    });
                  })
                  .mouseleave(() => {
                    $(svg).css({
                      visibility: 'hidden'
                    });
                  });
              }
            }, 500);
          }

          // Remove the event handler to show the "+" sign
          $(fullElementClassName).off();

          if (value.type === 'weather') {
            // Prevent duplicates
            if (!$(`${fullElementClassName} .forecast`).length) {

              // Check if location is defined and if the token is valid
              if (value.location !== undefined && owmToken.match(/[a-z0-9]{32}/)) {
                $.ajax({
                  url: `https://api.openweathermap.org/data/2.5/find?q=${value.location}&units=metric&lang=en&appid=${owmToken}`,
                  method: 'POST',
                  dataType: 'json',
                  statusCode: {
                    401: () => {
                      displayWeatherError(fullElementClassName);
                    },
                    200: (forecast => {
                      let resCode = forecast.cod;
                      let count = forecast.count;

                      // 404 errors handling (forecast.count can't be equals to 0)
                      if (count === 1) {

                        if ($('.addContent:visible').length) {
                          $('.addContent').hide();
                        }

                        let cityID = forecast.list[0].id;

                        // Format the forecast summary to get the first letter uppercase
                        let tempDescription = forecast.list[0].weather[0].description.split('');
                        let firstLetter = tempDescription[0].toUpperCase();
                        tempDescription.shift();
                        tempDescription.unshift(firstLetter);

                        tempDescription = tempDescription.join('');

                        let previsions = {
                          temp: forecast.list[0].main.temp,
                          city: forecast.list[0].name,
                          description: tempDescription,
                          humidity: forecast.list[0].main.humidity,
                          windSpeed: forecast.list[0].wind.speed,
                          weatherIcon: forecast.list[0].weather[0].icon
                        };

                        // Prevent duplicates
                        if (!$(`${fullElementClassName} .forecast`).length) {
                          let forecastContainer = $('<section></section>');
                          forecastContainer
                            .addClass('forecast flex')
                            .appendTo(fullElementClassName);

                          let forecastHeader = $('<span></span>');
                          forecastHeader
                            .addClass('forecast__header')
                            .appendTo(forecastContainer);

                          let forecastTitle = $('<a></a>');
                          forecastTitle
                            .addClass('forecast__header__title')
                            .text(`Weather in ${previsions.city}`)
                            .attr('href', `https://openweathermap.org/city/${cityID}`)
                            .appendTo(forecastHeader);

                          let forecastContent = $('<div></div>');
                          forecastContent
                            .addClass('forecast__content flex')
                            .appendTo(forecastContainer);

                          let forecastInfo = $('<div></div>');
                          forecastInfo
                            .addClass('forecast__content__info flex')
                            .appendTo(forecastContent);

                          let description = $('<span></span>');
                          description
                            .addClass('forecast__content__info__desc')
                            .appendTo(forecastInfo);

                          let descriptionDesc = $('<p></p>');
                          descriptionDesc
                            .addClass('forecast__content__info__description__desc flex')
                            .text(previsions.description)
                            .appendTo(description);

                          let descriptionIcon = $('<span></span>');
                          descriptionIcon
                            .addClass('forecastIcon')
                            .text('🛈')
                            .prependTo(description);

                          let temp = $('<span></span>');
                          temp
                            .addClass('forecast__content__info__temp')
                            .appendTo(forecastInfo);

                          let tempDesc = $('<p></p>');
                          tempDesc
                            .addClass('forecast__content__info__temp__desc flex')
                            .text(`${previsions.temp} °C`)
                            .appendTo(temp);

                          let tempIcon = $('<span></span>');
                          tempIcon
                            .addClass('forecastIcon')
                            .text('🌡')
                            .prependTo(temp);

                          let windSpeed = $('<span></span>');
                          windSpeed
                            .addClass('forecast__content__info__wind')
                            .appendTo(forecastInfo);

                          let windDesc = $('<p></p>');
                          windDesc
                            .addClass('forecast__content__info__wind__desc')
                            .text(`${previsions.windSpeed} km/h`)
                            .appendTo(windSpeed);

                          let windIcon = $('<img>');
                          windIcon
                            .addClass('forecastIcon')
                            .attr({
                              alt: 'wind icon',
                              src: './src/css/icons/interface/wind.svg'
                            })
                            .prependTo(windSpeed);

                          let humidity = $('<span></span>');
                          humidity
                            .addClass('forecast__content__info__humidity')
                            .appendTo(forecastInfo);

                          let humidityDesc = $('<p></p>');
                          humidityDesc
                            .addClass('forecast__content__info__humidity__desc flex')
                            .text(`${previsions.humidity} %`)
                            .appendTo(humidity);

                          let humidityIcon = $('<span></span>');
                          humidityIcon
                            .addClass('forecastIcon')
                            .text(`💧`)
                            .prependTo(humidity);

                          // Create a div to store the weather icon
                          let weatherIconContainer = $('<div></div>');
                          weatherIconContainer
                            .addClass('forecast__weatherIcon flex')
                            .appendTo(forecastContent);

                          // Define the weather icon
                          let weatherIcon = $('<span></span>');
                          weatherIcon
                            .addClass('forecast__weatherIcon__icon')
                            .appendTo(weatherIconContainer);

                          // Add weather icon
                          updateWeatherIcon(previsions);

                          // Add content options
                          let contentOptions = $('<span></span>');
                          contentOptions
                            .addClass('contentOptions')
                            .appendTo(forecastHeader);

                          let updateContentBtn = $('<img>');
                          updateContentBtn
                            .addClass('updateContentBtn')
                            .attr({
                              alt: 'Update content',
                              src: './src/css/icons/interface/refresh.svg'
                            })
                            .appendTo(contentOptions);

                          let removeContentBtn = $('<img>');
                          removeContentBtn
                            .addClass('removeContentBtn')
                            .attr({
                              alt: 'Remove content',
                              src: './src/css/icons/interface/cross.svg'
                            })
                            .appendTo(contentOptions);

                          addContentOptions(fullElementClassName);
                        }
                      } else {
                        let warningMsg = 'Sorry homie, it seems this location doesn\'t exist...';
                        if ($('.addContent:visible').length) {
                          if (!$('.addContent .warning').length) {
                            let warning = $('<span></span>');
                            warning
                              .addClass('warning')
                              .text(warningMsg)
                              .appendTo($('.addContent__weather'));
                          }
                        } else {
                          // Prevent duplicates
                          if (!$(`${fullElementClassName} .warning`).length) {
                            let errorMsg = $('<span></span>');
                            errorMsg
                              .addClass('warning')
                              .css({
                                marginTop: 0,
                                alignItems: 'center'
                              })
                              .text(warningMsg)
                              .appendTo(fullElementClassName);
                          }
                        }
                      }
                    })
                  }
                })
              }
            }
          }

          if (value.type === 'rss') {
            let feed = value.feed;

            const buildRssContainer = (feed, callback) => {
              let rssContainer = $('<section></section>');
              let linksContainer = $('<div></div>');
              for (let i = 0; i < 10; i++) {
                if (feed[i] !== undefined && feed[i].title !== undefined && feed[i].link !== undefined) {
                  rssContainer
                    .addClass('rssContainer flex');

                  linksContainer
                    .addClass('linksContainer')
                    .appendTo(rssContainer);

                  let article = $('<div></div>');
                  article
                    .addClass('article flex')
                    .appendTo(linksContainer);

                  let link = $('<a></a>');
                  link
                    .addClass('link')
                    .attr('href', feed[i].link)
                    .text(feed[i].title)
                    .appendTo(article);


                  let summary = $('<div></div>');
                  summary
                    .addClass('article__desc')
                    .append(feed[i].summary)
                    .appendTo(linksContainer);
                }
              };
              callback(feed, rssContainer);
            }

            if (!$(`${fullElementClassName} .rssContainer`).length) {
              buildRssContainer(feed, (feed, rssContainer) => {
                rssContainer.appendTo(fullElementClassName);

                let rssContainerHeader = $('<div></div>');
                rssContainerHeader
                  .addClass('rssContainer__header')
                  .prependTo(`${fullElementClassName} .rssContainer`);

                let feedTitle = $('<a></a>');
                feedTitle
                  .addClass('feedTitle')
                  .attr({
                    href: feed[0].meta.link
                  })
                  .text(feed[0].meta.title)
                  .prependTo(`${fullElementClassName} .rssContainer__header`);

                // Add content options
                let contentOptions = $('<span></span>');
                contentOptions
                  .addClass('contentOptions')
                  .appendTo(rssContainerHeader);

                let updateContentBtn = $('<img>');
                updateContentBtn
                  .addClass('updateContentBtn')
                  .attr({
                    alt: 'Update content',
                    src: './src/css/icons/interface/refresh.svg'
                  })
                  .appendTo(contentOptions);

                let removeContentBtn = $('<img>');
                removeContentBtn
                  .addClass('removeContentBtn')
                  .attr({
                    alt: 'Remove content',
                    src: './src/css/icons/interface/cross.svg'
                  })
                  .appendTo(contentOptions);

                $(`${fullElementClassName} .article`)
                  .mouseenter((event) => {
                    if (event.currentTarget.className.match('article')) {
                      $(event.currentTarget.nextElementSibling)
                        .clone()
                        .appendTo('.rssTooltip');

                      if (mousePosition.x < ($(window).width() / 100 * 30)) {
                        $('.rssTooltip .article__desc')
                          .css({
                            display: 'inline-block',
                            top: mousePosition.y - ($(window).width() / 100 * 5),
                            left: mousePosition.x + ($(window).width() / 100 * 15)
                          });
                      } else {
                        $('.rssTooltip .article__desc')
                          .css({
                            display: 'inline-block',
                            top: mousePosition.y - ($(window).width() / 100 * 5),
                            left: mousePosition.x - ($(window).width() / 100 * 35)
                          });
                      }
                    }
                  }).mouseleave((event) => {
                    $('.rssTooltip .article__desc').remove();
                  })

                addContentOptions(fullElementClassName);
              });
            }
          }

          // Add a margin to the dynamicaly created divs
          if (!parent.match(iElement)) {
            $(fullElementClassName).addClass('subRow');
          }

          addNewContentContainer();
        });

        // Hide the '.blank' divs if there are visibles siblings
        $(fullElementClassName).ready(() => {
          if (i === parsedData.length - 1 && !$(`${fullElementClassName} .blank`).siblings('*:visible')) {
            $(`${fullElementClassName} .blank`).hide();
          }
        });
      }
    });
  }

  const printError = (msg) => {
    $('.msgContainer')
      .addClass('warning')
      .text(msg)
      .show();

    setTimeout(() => {
      $('.msgContainer')
        .hide()
        .removeClass('warning');
    }, 5000);
  }

  const processInput = (msg) => {
    let args = msg.split(' ');

    if (msg.startsWith('!')) {
      // Search shortcuts
      openUrl(msg);

      // Download an audio file
      if (msg.startsWith('!d ')) {
        let url = '';
        if (msg.match(/[0-9A-Za-z_-]{11}/)) {
          let id = msg.match(/[0-9A-Za-z_-]{11}/)[0];
          // Emit an event tAo server to handle the download
          socket.emit('download', id);

          // Ask for some audio info
          socket.emit('audio info request', {
            id: id
          });

          socket.on('audio info retrieved', (audioInfo) => {
            if (audioInfo.title !== undefined && audioInfo.title !== null) {
              let title = `Your download for ${audioInfo.title} started !`;
              $('#msgContainer').text(title);
              $('#msgContainer').show();
            }
          });

          socket.on('download ended', (data) => {
            $('#msgContainer').text(`Your download for ${data.title} ended !`);
            setTimeout(() => {
              $('#msgContainer').fadeOut(1500);
            }, 2000);

            window.open(`http://${ip}:8080/download`);
          });
        } else {
          printError(`You pasted an invalid link. If you tried to paste a URL, try the video ID only.`);
        }
      } else if (msg.startsWith('!p ')) {
        // Play audio function
        if (msg.match(/[0-9A-Za-z_-]{11}/) && !msg.match(/[0-9A-Za-z_-]{15,34}/)) {
          let id = msg.match(/[0-9A-Za-z_-]{11}/)[0];
          let url = `https://www.invidio.us/latest_version?id=${id}&itag=251&local=true`;

          if (!$('.audio__player').length) {
            let audioPlayer = $('<audio></audio>');
            audioPlayer
              .attr({
                id: 'audio__player',
                controls: 'controls',
                autoplay: 'autoplay'
              })
              .addClass('audio__player')
              .text('Your browser does not support the audio element.')
              .appendTo('.player');

            let audioSrc = $('<source>');
            audioSrc.attr({
                id: 'audioSrc',
                src: url,
                type: 'audio/mpeg'
              })
              .appendTo('.audio__player');
          } else {
            $('#audioSrc').attr('src', url);
          }

          socket.emit('audio info request', {
            id: id
          });

          // Avoid the Jquery 'load' function and show the audio player
          document.getElementById('audio__player').load();

          // Adapt the #moreContent height so all the elements can fit on the page
          $('.moreContent').height('60%');


          socket.on('audio info retrieved', (streamInfo) => {
            // console.log(JSON.stringify(streamInfo, null, 2));
            streamInfo.title = streamInfo.title.match(/[a-zA-Z0-9 \-#/\\_=+:;.]/g).join('');

            // If the info about the track are not displayed, add them
            if (!$('.streamInfoContainer').length) {
              let streamInfoContainer = $('<span></span>');
              streamInfoContainer
                .addClass('streamInfoContainer')
                .append(`<span id="streamText">You're listening to </span><span id="streamTitle"></span><p id="YtId"></p>`)
                .appendTo('.audioMsg');
            }

            // Hide playlist controls if they exists
            if ($('.player__leftSvg').length || $('.player__rightSvg').length) {
              $('.player__leftSvg, .player__rightSvg, .playlistInfo').hide();
            }

            // Else, just replace the old info with the new ones
            $('#streamTitle').text(streamInfo.title);
            $('#YtId')
              .text(` (Youtube ID : ${id})`)
              .css({
                display: 'block',
                margin: '0.5em 0 0.1em 0'
              });

            $('.streamInfoContainer')
              .css({
                textAlign: 'center',
                width: '100%'
              });

            $('.audioMsg, .streamInfoContainer, .audio__player').show();
            $('.audio').fadeIn(1500);
          });

          $('.audio').addClass('flex');

          document.getElementById('audio__player').onended = () => {
            $('.audio').fadeOut(1500);
          };

          // Remove the player on delete button click
          removeAudioPlayer();
        } else if (msg.match(/[a-zA-Z0-9-_]{15,34}/)[0] !== null) {
          // Check if the keyword match a playlist pattern

          // Reset the playlist counter
          iPlaylist = 0;
          let id = msg.match(/[a-zA-Z0-9-_]{15,34}/)[0];
          let apiUrl = `https://invidio.us/api/v1/playlists/${id}`;

          socket.emit('parse playlist', apiUrl);

          socket.on('playlist parsed', () => {
            $.ajax({
              url: './tmp/playlist.json',
              dataType: 'json',
              method: 'GET'
            }).done((data) => {
              listen2Playlist(data);
            });
          });
        } else {
          printError('Bad URL :((');
        }
      }
    } else {
      if (msg !== null && msg !== undefined && msg !== '') {
        // DuckDuckGo search
        let keywords = args.join('+');
        window.open(`https://duckduckgo.com/?q=${keywords}`);

        // Empty the search box
        $("#questionBox").val('');
      }
    }
  }

  const removeAudioPlayer = () => {
    $('.audio__remove').click(() => {
      // Stop the audio playback
      document.getElementById('audio__player').stop();

      // Hide the whole audio container
      $('.audio').hide();

      // Adapt the height of the moreContent container
      $('.moreContent').height('70%');
    });
  }

  const questionBoxSubmit = () => {
    if ($('#questionBox').val() !== '') {
      $('#form').submit((event) => {
        // Reset the playlist counter
        iPlaylist = 0;

        let msg = $("#questionBox").val();
        event.preventDefault();
        processInput(msg);
      });
    }
  }

  const showSettings = () => {
    // Create an object to store the new settings values
    let updatedSettings = {};
    let checkboxState = $('.toggleRss__Input').prop('checked');

    if (!checkboxState) {
      $('.toggleRss__Slider').addClass('unchecked');
    } else {
      $('.toggleRss__Slider').removeClass('unchecked');
    }

    $('#settingsBtn').click(() => {
      $('#backgroundImage, header, #mainContainer')
        .css('filter', 'blur(4px)');
      $('.settings__container')
        .fadeIn()
        .css('display', 'flex')
        .addClass('flex');
    });

    // Simulate click on the input to upload a file and enable the rss feed feature on startup
    $('#backgroundImageUploadForm__Btn').click(() => {
      $('#backgroundImageUploadForm__InputFile').click();
    });

    $('#toggleRss__Switch').click(() => {
      updatedSettings.RSS = $('.toggleRss__Input').prop('checked');
      // Adapt the design of the slider if the input is checked
      if (!$('.toggleRss__Input').prop('checked')) {
        $('.toggleRss__Slider').addClass('unchecked');
      } else {
        $('.toggleRss__Slider').removeClass('unchecked');
      }
    });

    $('#settings__child__cancelBtn').click(() => {
      $('#backgroundImage, header, #mainContainer')
        .css('filter', 'none');
      $('.settings__container').fadeOut();
    });

    $('#settings__child__saveBtn').click(() => {
      // Only submit the form if one of the fields are fullfilled
      if ($('#backgroundImageUploadForm__InputFile').val() !== '' && $('#backgroundImageUploadForm__InputUrl').val() === '') {
        let fullPath = $('#backgroundImageUploadForm__InputFile').val().split('\\');
        fullPath.splice(0, 2);
        let imagePath = fullPath[0];
        updatedSettings.backgroundImage = `./upload/${imagePath}`;

        let fd = new FormData();
        fd.append('backgroundImageUploadInput', $('#backgroundImageUploadForm__InputFile')[0].files[0], imagePath);

        $.ajax({
          url: '/upload',
          type: 'POST',
          data: fd,
          processData: false,
          contentType: false,
          statusCode: {
            200: () => {
              console.log(fd, 'file sent !');
            },
            404: () => {
              console.log('page not found !');
            }
          }
        });

        $('#backgroundImage').css('backgroundImage', updatedSettings.backgroundImageFile);
      } else if ($('#backgroundImageUploadForm__InputFile').val() === '' && $('#backgroundImageUploadForm__InputUrl').val() !== '') {
        if ($('#backgroundImageUploadForm__InputUrl').val().match(/^(http|https):\/\/(www.|)[a-zA-Z0-9\/]{1,}\.\w.+/i)) {
          if ($('#backgroundImageUploadForm__InputUrl').val().length < 100) {
            updatedSettings.backgroundImage = $('#backgroundImageUploadForm__InputUrl').val();
            $('#backgroundImage').css('backgroundImage', updatedSettings.backgroundImage);
          } else {
            displayUploadWarning('Your URL is too large ! Please shorten it !');
          }
        }
      } else if ($('#backgroundImageUploadForm__InputFile').val() !== '' && $('#backgroundImageUploadForm__InputUrl').val() !== '') {
        displayUploadWarning('Hey, don\'t be too powerful dude ! One field at a time !');
      }

      if (checkboxState !== $('.toggleRss__Input').prop('checked')) {}

      if ($('#backgroundImageUploadForm__InputFile').val() === '' && $('#backgroundImageUploadForm__InputUrl').val() === '' && $('.owmToken__input').val() === '') {
        // If none of the fields are fullfilled, just hide the settings menu
        $('#backgroundImage, header, #mainContainer')
          .css('filter', 'none');

        $('.settings__container').fadeOut();
      }

      if ($('.owmToken__input').val().match(/[a-z0-9]{32}/)) {
        // OpenWeatherMap token
        updatedSettings.owmToken = $('.owmToken__input').val();
      }

      // Send the updated settings to the server
      socket.emit('customization', updatedSettings);

      $('.owmToken__Comment').text(`Your OpenWeatherMap token is ${updatedSettings.owmToken}. You can update it here !`);

      $('#backgroundImage, header, #mainContainer')
        .css('filter', 'none');

      $('.settings__container').fadeOut();

      if (updatedSettings.RSS !== checkboxState) {
        location.reload();
      }
    });

    socket.on('RSS status retrieved', RssStatus => {
      if (RssStatus) {
        $('.toggleRss__Input').prop('checked', true);
      } else {
        $('.toggleRss__Input').prop('checked', false);
      }
    })
  }

  const suggestions = [{
      label: '!1337x',
      desc: '1337x.to',
      icon: './src/css/icons/suggestions/1337x.ico',
      url: 'https://1337x.to/search/'
    },
    {
      label: '!afr',
      desc: 'Amazon (FR)',
      icon: './src/css/icons/suggestions/amazon.png',
      url: 'https://www.amazon.fr/s?k='
    },
    {
      label: '!a',
      desc: 'Amazon (US)',
      icon: './src/css/icons/suggestions/amazon.png',
      url: 'https://www.amazon.com/s?k='
    },
    {
      label: '!alto',
      desc: 'AlternativeTo',
      icon: './src/css/icons/suggestions/alto.ico',
      url: 'https://alternativeto.net/browse/search?q='
    },
    {
      label: '!css',
      desc: 'CSS Tricks',
      icon: './src/css/icons/suggestions/csstricks.png',
      url: 'https://css-tricks.com/?s='
    },
    {
      label: '!d',
      desc: 'Download a YouTube audio stream',
      icon: './src/css/icons/suggestions/'
    },
    {
      label: '!fdroid',
      desc: 'F-Droid',
      icon: './src/css/icons/suggestions/fdroid.png',
      url: 'https://search.f-droid.org/?q='
    },
    {
      label: '!g',
      desc: 'Google',
      icon: './src/css/icons/suggestions/google.png',
      url: 'https://www.google.com/search?q='
    },
    {
      label: '!gh',
      desc: 'Github',
      icon: './src/css/icons/suggestions/github.ico',
      url: 'https://github.com/search?q='
    },
    {
      label: '!gt',
      desc: 'Google translate',
      icon: './src/css/icons/suggestions/gt.ico',
      url: 'https://translate.google.com/#view=home&op=translate&sl=auto&tl=en&text='
    },
    {
      label: '!gmap',
      desc: 'Google Maps',
      icon: './src/css/icons/suggestions/maps.ico',
      url: 'https://www.google.be/maps/search/'
    },
    {
      label: '!iv',
      desc: 'Invidio.us',
      icon: './src/css/icons/suggestions/invidious.png',
      url: 'https://invidio.us/search?q='
    },
    {
      label: '!jquery',
      desc: 'Jquery API',
      icon: './src/css/icons/suggestions/jquery.ico',
      url: 'https://api.jquery.com/?ns0=1&s='
    },
    {
      label: '!jq',
      desc: 'Jquery API',
      icon: './src/css/icons/suggestions/jquery.ico',
      url: 'https://api.jquery.com/?ns0=1&s='
    },
    {
      label: '!ldlc',
      desc: 'LDLC',
      icon: './src/css/icons/suggestions/ldlc.png',
      url: 'https://www.ldlc.com/fr-be/recherche/'
    },
    {
      label: '!li',
      desc: 'LinkedIn',
      icon: './src/css/icons/suggestions/linkedin.ico',
      url: 'https://www.linkedin.com/search/results/all/?keywords='
    },
    {
      label: '!mdn',
      desc: 'Mozilla Developer network',
      icon: './src/css/icons/suggestions/mdn.png',
      url: 'https://developer.mozilla.org/en-US/search?q='
    },
    {
      label: '!pb',
      desc: 'Pages Blanches (BE)',
      icon: './src/css/icons/suggestions/pagesblanches.ico',
      url: 'https://www.pagesblanches.be/chercher/personne/'
    },
    {
      label: '!os',
      desc: 'OpenSubtitles',
      icon: './src/css/icons/suggestions/opensub.ico',
      url: 'https://www.opensubtitles.org/en/search2/sublanguageid-all/moviename-'
    },
    {
      label: '!osm',
      desc: 'OpenStreetMap',
      icon: './src/css/icons/suggestions/osm.png',
      url: 'https://www.openstreetmap.org/search?query='
    },
    {
      label: '!owm',
      desc: 'OpenWeatherMap',
      icon: './src/css/icons/suggestions/owm.ico',
      url: 'https://openweathermap.org/find?q='
    },
    {
      label: '!p',
      desc: 'Play a Youtube audio stream or playlist',
      icon: './src/css/icons/suggestions/play.svg'
    },
    {
      label: '!rarbg',
      desc: 'RARBG',
      icon: './src/css/icons/suggestions/rarbg.png',
      url: 'http://rarbgmirror.org/torrents.php?search='
    },
    {
      label: '!rt',
      desc: 'Rottentomatoes',
      icon: './src/css/icons/suggestions/rottentomatoes.png',
      url: 'https://www.rottentomatoes.com/search/?search='
    },
    {
      label: '!rtbf',
      desc: 'RTBF',
      icon: './src/css/icons/suggestions/rtbf.png',
      url: 'https://www.rtbf.be/info/recherche?q='
    },
    {
      label: '!sc',
      desc: 'SoundCloud',
      icon: './src/css/icons/suggestions/soundcloud.ico',
      url: 'https://soundcloud.com/search?q='
    },
    {
      label: '!so',
      desc: 'Stack Overflow',
      icon: './src/css/icons/suggestions/so.ico',
      url: 'https://stackoverflow.com/search?q='
    },
    {
      label: '!torrent',
      desc: 'Torrent9.cz',
      icon: './src/css/icons/suggestions/torrent9.ico',
      url: 'https://www.torrent9.cz/recherche/'
    },
    {
      label: '!translate',
      desc: 'Google translate',
      icon: './src/css/icons/suggestions/gt.ico',
      url: 'https://translate.google.com/#view=home&op=translate&sl=auto&tl=en&text='
    },
    {
      label: '!uc',
      desc: 'Unicode table',
      icon: './src/css/icons/suggestions/unicode.ico',
      url: 'https://unicode-table.com/en/search/?q='
    },
    {
      label: '!w',
      desc: 'Wikipedia (EN)',
      icon: './src/css/icons/suggestions/wikipedia.ico',
      url: 'https://en.wikipedia.org/w/index.php?search='
    },
    {
      label: '!wfr',
      desc: 'Wikipedia (FR)',
      icon: './src/css/icons/suggestions/wikipedia.ico',
      url: 'https://fr.wikipedia.org/w/index.php?search='
    },
    {
      label: '!wt',
      desc: 'Wikitionnary (EN)',
      icon: './src/css/icons/suggestions/wt.ico',
      url: 'https://en.wiktionary.org/w/index.php?search='
    },
    {
      label: '!wtfr',
      desc: 'Wikitionnary (FR)',
      icon: './src/css/icons/suggestions/wt.ico',
      url: 'https://fr.wiktionary.org/w/index.php?search='
    },
    {
      label: '!yarn',
      desc: 'Yarn',
      icon: './src/css/icons/suggestions/yarn.ico',
      url: 'https://yarnpkg.com/en/packages?q='
    },
    {
      label: '!yt',
      desc: 'Youtube',
      icon: './src/css/icons/suggestions/yt.ico',
      url: 'https://www.youtube.com/results?search_query='
    }
  ];

  const updateWeatherIcon = (previsions) => {
    if (previsions.description.match(/clear sky/i)) {
      $('.forecast__weatherIcon__icon')
        .text('☼')
        .css({
          color: 'yellow'
        });
    } else if (previsions.description.match(/clouds/i)) {
      $('.forecast__weatherIcon__icon')
        .text('☁');
    } else if (previsions.description.match(/rain/i)) {
      $('.forecast__weatherIcon__icon')
        .text('🌧');
    } else if (previsions.description.match(/mist/i)) {
      $('.forecast__weatherIcon__icon').addClass('icon flex');

      let mistIcon = $('<img>')
        .attr({
          src: './src/css/icons/interface/mist.svg',
          alt: 'Mist icon'
        });

      if (!$('.forecast__weatherIcon__icon img').length) {
        mistIcon.appendTo($('.forecast__weatherIcon__icon'));
      } else {
        $('.forecast__weatherIcon__icon img').replaceWith(mistIcon);
      }
    }
  }

  $('.content3__container .content3').ready(() => {
    $('.credits').hide();

    addContent('.content1__container', '.content1');
    addContent('.content2__container', '.content2');
    addContent('.content3__container', '.content3');

    // Show settings on button click
    showSettings();

    // Add containers on startup
    parseContent();

    // If RSS feeds are disabled, hide the moreContent div
    if (!$('#toggleRss__Input').prop('checked')) {
      $('.moreContent').hide();
    }

    socket.on('refresh app', () => {
      location.reload();
    });

    socket.on('errorMsg', (msg) => {
      printError(msg);
    });

    socket.on('server settings updated', (data) => {
      if (data !== null && data !== undefined) {
        $('#backgroundImage')
          .css('background-image', `url(${data.backgroundImage})`);

        $('#backgroundImage, header, #mainContainer')
          .css('filter', 'none');

        $('#settings').fadeOut();
      }
    });

    // Autocomplete
    $('#questionBox').on('input', () => {
      autocomplete($('#questionBox').val());
    });

    $('#form').keypress((event) => {
      if (event.keyCode === 13) {
        questionBoxSubmit();
        $('#formContainer').css({
          padding: '0.5% 1%'
        });
      }
    })

    //Submit form on svg icon click
    $('#formSubmit').click(() => {
      questionBoxSubmit();
    });

    // If the msgContainer is empty, hide it
    if (!$('#msgContainer').text().match(/\w.+/)) {
      $('#msgContainer').hide();
    } else {
      fade('#msgContainer');
    }

    // Get current mouse position
    getMousePosition();

    // Dynamically show the footer
    $('#footer').mouseenter(() => {
      $('#credits')
        .fadeIn();
    }).mouseleave(() => {
      $('#credits').fadeOut();
    });
  });
});
