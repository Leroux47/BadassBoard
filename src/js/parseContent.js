// Add content of other types than RSS
const parseContent = () => {
  socket.on('parse content', (parsedData) => {

    // console.log(JSON.stringify(parsedData, null, 2));
    for (const [i, value] of parsedData.entries()) {

      const buildElement = (parent, element, iElement, callback) => {


        if (!$(element).length) {
          let container = $('<div></div>')
            .addClass(`content content${iElement}`)
            .attr('id', `content${iElement}`);

          if (!$(element).length) {
            container.appendTo(parent);
          }

          $(element).ready(() => {
            // Append the new divs to the newly created element
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
                .addClass(`newContent content subRow flex`)
                .appendTo(parent)
                .prepend(newBlank)
                .append(newAddContent);
            }

            if ($('footer').css('position') === 'absolute') {
              $('.footer').css({
                position: '',
                top: ''
              });
            }

            let svg = $(`${parent} .newContent .blank`);

            $(svg).click(() => {

              $(`${parent} .newContent .addContent`)
                .css('display', '')
                .addClass('flex');

              $(svg).hide();

              $(`${parent} .newContent .addContent`).ready(() => {
                handleOptionSelection(parent, '.newContent');
              });
            });

            // Fix the content divs order
            $('.newContent').ready(() => {
              $('.newContent .blank').removeClass('invisible');
              $('.content').each(function(index) {

                // Exclude the ".newContent" div
                if (!$(this).hasClass('newContent')) {
                  $(this).css('order', $(this).attr('id').substring(7, 9));
                } else {
                  // Send the newContent div at the bottom
                  $(this).css('order', 100);
                }
              });
            });
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
                    printError({
                      type: 'weather',
                      msg: 'Sorry dude, your OpenWeatherMap token is invalid 😢. Please modify it in the settings.',
                      element: fullElementClassName
                    });
                  },
                  200: (forecast => {
                    let resCode = forecast.cod;
                    let count = forecast.count;

                    // 404 errors handling (forecast.count can't be equals to 0)
                    if (count !== 0) {
                      addWeatherContainer(forecast, fullElementClassName, addNewContentContainer);
                    } else {
                      printError({
                        type: 'weather',
                        msg: 'Sorry homie, it seems this location doesn\'t exist...',
                        element: fullElementClassName
                      });
                    }
                  })
                }
              })
            }
          }
        }

        if (value.type === 'rss') {
          let feed = value.feed;

          // Create the RSS container if they don't exist
          if (!$(`${fullElementClassName} .rssContainer`).length) {
            buildRssContainer(feed, (feed, rssContainer) => {
              rssContainer.appendTo(fullElementClassName, () => {
                $(`${fullElementClassName} .blank`).addClass('invisible');
              });

              let rssContainerHeader = $('<div></div>')
                .addClass('rssContainer__header')
                .prependTo(`${fullElementClassName} .rssContainer`);

              let feedTitle = $('<a></a>')
                .addClass('feedTitle')
                .attr({
                  href: feed[0].meta.link
                })
                .text(feed[0].meta.title)
                .prependTo(`${fullElementClassName} .rssContainer__header`);

              // Add content options
              let contentOptions = $('<span></span>')
                .addClass('contentOptions')
                .appendTo(rssContainerHeader);

              let updateContentBtn = $('<img>')
                .addClass('updateContentBtn')
                .attr({
                  alt: 'Update content',
                  src: './src/css/icons/interface/refresh.svg'
                })
                .appendTo(contentOptions);

              let removeContentBtn = $('<img>')
                .addClass('removeContentBtn')
                .attr({
                  alt: 'Remove content',
                  src: './src/css/icons/interface/cross.svg'
                })
                .appendTo(contentOptions);

              displayArticleSummary();

              addContentOptions(fullElementClassName);

              addNewContentContainer();
            });
          }
        }

        if (value.type === 'youtube search') {

          if (!$('.youtubeSearchContainer').length) {
            let youtubeSearchContainer = $('<section></section>')
              .addClass('youtubeSearchContainer')
              .appendTo(fullElementClassName);

            let headerText = $('<p></p>').text('Instant Youtube search');

            let youtubeSearchHeader = $('<div></div>')
              .addClass('youtubeSearchContainer__header flex')
              .appendTo(`${fullElementClassName} .youtubeSearchContainer`)
              .append(headerText);

            let youtubeSearchInput = $('<input>')
              .addClass('youtubeSearchContainer__content__input')
              .attr('placeholder', 'Type here to search Youtube...');

            let youtubeSearchResults = $('<div></div>')
              .addClass('youtubeSearchContainer__content__results flex');

            let youtubeSearchContent = $('<div></div>')
              .addClass('youtubeSearchContainer__content flex')
              .append(youtubeSearchInput, youtubeSearchResults)
              .appendTo(`${fullElementClassName} .youtubeSearchContainer`);

            // Add content options
            let contentOptions = $('<span></span>')
              .addClass('contentOptions')
              .appendTo(youtubeSearchHeader);

            let updateContentBtn = $('<img>')
              .addClass('contentOptions__clearResultsbtn')
              .attr({
                alt: 'Clear search results',
                src: './src/css/icons/interface/clear.svg'
              })
              .appendTo(contentOptions);

            let removeContentBtn = $('<img>')
              .addClass('removeContentBtn')
              .attr({
                alt: 'Remove content',
                src: './src/css/icons/interface/cross.svg'
              })
              .appendTo(contentOptions);

            addContentOptions(fullElementClassName);

            addNewContentContainer();
          }

          $('.youtubeSearchContainer *').keypress((event) => {
            if (event.keyCode === 13) {
              // Hide the results container
              $('.youtubeSearchContainer__content__results').addClass('invisible');

              $.ajax({
                url: `https://invidio.us/api/v1/search?q=${$('.youtubeSearchContainer__content__input').val()}&language=json&type=all`,
                method: 'GET',
                dataType: 'json',
                statusCode: {
                  200: (res) => {
                    for (let i = 0; i < res.length; i++) {
                      let title = '';
                      let id = '';
                      let duration = '';
                      let resultContent = '';
                      let thumbnail = '';

                      const processResults = () => {
                        let result = $('<span></span>')
                          .addClass(`youtubeSearchContainer__content__results__result youtube__result${i} flex`)
                          .append(resultContent)
                          .appendTo('.youtubeSearchContainer__content__results');

                        let thumbnailContainer = $('<div></div>')
                          .addClass('youtubeSearchContainer__content__results__result__thumbnailContainer')
                          .prependTo(result);

                        if (res[i].type !== 'channel' && res[i].type !== 'playlist') {
                          thumbnail = $('<img>')
                            .attr('alt', `${res[i].title} thumbnail`)
                            .attr('src', res[i].videoThumbnails[0].url)
                            .prependTo(thumbnailContainer);
                        } else if (res[i].type === 'channel') {
                          thumbnail = $('<img>')
                            .attr('alt', `${res[i].author} channel thumbnail`)
                            .attr('src', res[i].authorThumbnails[0].url)
                            .prependTo(thumbnailContainer);
                        } else if (res[i].type === 'playlist') {
                          thumbnail = $('<img>')
                            .attr('alt', `${res[i].title} thumbnail`)
                            .attr('src', res[i].playlistThumbnail)
                            .prependTo(thumbnailContainer);
                        }
                      }

                      if (res[i].type === 'video') {
                        title = $(`<a></a>`)
                          .attr('href', `https://invidio.us/watch?v=${res[i].videoId}`)
                          .text(res[i].title);

                        id = $('<p></p>').text(res[i].videoId).prepend('<u>Video ID</u> : ');

                        duration = $('<p></p>').text(`${res[i].lengthSeconds} s.`).prepend('<u>Duration</u> : ');
                      } else if (res[i].type === 'channel') {
                        title = $(`<a></a>`)
                          .attr('href', `https://invidio.us${res[i].authorUrl}`)
                          .text(res[i].author);

                        duration = $('<p></p>').text(res[i].videoCount).prepend('<u>Number of videos</u> : ');
                      } else if (res[i].type === 'playlist') {
                        title = $(`<a></a>`)
                          .attr('href', `https://invidio.us/playlist?list=${res[i].playlistId}`)
                          .text(res[i].title);

                        id = $('<p></p>').text(`${res[i].playlistId}`).prepend('<u>Playlist ID</u> : ');

                        duration = $('<p></p>').text(res[i].videoCount).prepend('<u>Number of videos</u> : ');
                      }

                      if (id !== '') {
                        resultContent = $('<span></span>')
                          .addClass('youtubeSearchContainer__content__results__result__content flex')
                          .append(title, duration, id);
                      } else {
                        resultContent = $('<span></span>')
                          .addClass('youtubeSearchContainer__content__results__result__content flex')
                          .append(title, duration);
                      }

                      if (!$(`.youtube__result${i}`).length) {
                        processResults();
                      } else if ($('.youtubeSearchContainer__content__results').length) {
                        $('.youtubeSearchContainer__content__results').empty();
                        processResults();
                      }

                      if (i === 1) {
                        // Show the results container
                        $('.youtubeSearchContainer__content__results')
                          .removeClass('invisible')
                          .css('visibility', 'visible');
                      }
                    }
                  }
                }
              });
            }
          });

        }

        // Add a margin to the dynamicaly created divs
        if (!parent.match(iElement)) {
          $(fullElementClassName).addClass('subRow');
        }
      });
    }
  });
}
