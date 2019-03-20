// Simple focus trap for dialog
window.onload = function() {
  var firstAnchor = document.getElementById("name"),
      lastAnchor = document.getElementById("cancel-btn");

  function keydownHandler(e) {
      var evt = e || window.event;
      var keyCode = evt.which || evt.keyCode;
      if(keyCode === 9) { // TAB pressed
          if(evt.preventDefault) evt.preventDefault();
          else evt.returnValue = false;
          firstAnchor.focus();
      }
  }
  if(lastAnchor.addEventListener) lastAnchor.addEventListener('keydown', keydownHandler, false);
  else if(lastAnchor.attachEvent) lastAnchor.attachEvent('onkeydown', keydownHandler);
}


let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      if (self.newMap) {
        // if map exists remove before redraw
        self.newMap.remove();
      }
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoiYWRhczE5OTAiLCJhIjoiY2puNWhua2J1MHZoZjN2bzl1YnRqZ2YxOSJ9.VGcgvXLLrIo2jmDbg6aZAw',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const favEl = document.getElementById('is-favorite');
  // API saves is_favorite as string instead of boolean
  if (restaurant.is_favorite === 'true') {
    favEl.innerHTML = '♥';
  } else {
    favEl.innerHTML = '♡';
  }

  const address = document.getElementById('restaurant-address');
  address.setAttribute('aria-label', 'Restaurant Address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.alt = `Image of restaurant ${restaurant.name}`;
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  address.setAttribute('aria-label', 'Restaurant Cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  // reset reviews
  while (ul.firstElementChild) {
    ul.removeChild(ul.firstElementChild);
  }
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });

  container.appendChild(ul);

  const dialog = document.getElementById('formBlock');
  dialog.addEventListener('close', (e) => {
    const backDrop = document.getElementById('backDrop');
    backDrop.classList.remove('show');
  });

}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const titleCt = document.createElement('div');
  titleCt.className = 'review-title';
  li.appendChild(titleCt);

  const name = document.createElement('span');
  name.className = 'reviewer-name';
  name.innerHTML = review.name;
  titleCt.appendChild(name);

  const date = document.createElement('span');
  date.innerHTML = new Date(review.updatedAt).toDateString();
  date.className = 'review-date';
  titleCt.appendChild(date);

  const bodyCt = document.createElement('div');
  bodyCt.className = 'review-body';
  li.appendChild(bodyCt);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.className = 'review-rating';
  bodyCt.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.className = 'review-comments';
  bodyCt.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  // the method is invoked twice - once for cache & once for fetch
  // remove all but first child so that there is no duplicate node
  Array.prototype.slice.call(breadcrumb.children, 1).forEach(el => el.remove());
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

showForm = () => {
  const formBlock = document.getElementById('formBlock');
  const backDrop = document.getElementById('backDrop');
  if (!formBlock.hasAttribute('open')) {
    formBlock.showModal();
    backDrop.classList.add('show');
  } else {
    formBlock.close();
    backDrop.classList.remove('show');
  }
}

onFormSubmit = (cancel = false) => {
  if (cancel) {
    showForm();
    return;
  }
  const form = document.getElementById('review-form');
  const data = Object.values(form).reduce(
    (obj, field) => {
      if (field.type === 'radio' && !field.checked) return obj;
      obj[field.name] = field.value;
      return obj
    }, {}
  );
  data.restaurant_id = self.restaurant.id;
  data.updatedAt = Date.now();
  data.isPhantom = true;
  self.restaurant.reviews = [...self.restaurant.reviews, data];
  DBHelper.submitReviewForRestaurant(self.restaurant, data);
  fillReviewsHTML();
  showForm();
  form.reset();
}

onKeyPress = (btn, cancel = false) => {
  if (document.activeElement === btn) {
    onFormSubmit(cancel);
  }
}

markAsFavorite = (el) => {
  if (el.innerHTML === '♡') {
    el.innerHTML = '♥';
    self.restaurant.is_favorite = true;
    DBHelper.toggleIsFavorite(self.restaurant, true);
  } else if (el.innerHTML === '♥') {
    el.innerHTML = '♡';
    self.restaurant.is_favorite = false;
    DBHelper.toggleIsFavorite(self.restaurant, false);
  }
}
