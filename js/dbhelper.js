document.addEventListener('DOMContentLoaded', (event) => {
  _dbPromise = openDatabase();
});

openDatabase = () => {
  if (!navigator.serviceWorker) {
    return Promise.resolve();
  }
  return idb.open('mws-restaurants', 1, function (upgradeDb) {
    upgradeDb.createObjectStore('mws-restaurants', {
      keyPath: 'id'
    });
  });
}

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 8080 // Change this to your server port
    return `http://localhost:${port}/data/restaurants.json`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    if (typeof _dbPromise === 'undefined') return;
    DBHelper.showCachedData(callback);
    fetch('http://localhost:1337/restaurants')
      .then(response => response.json())
      .then(data => {
        // cache the response to idb
        DBHelper.cacheToDb(data);
        // process the response and invoke callback
        DBHelper.invokeCb(callback, data);
      })
      .catch(error => callback(error, null));
  }

  static invokeCb(callback, data) {
    // Casa Enrique (id: 10) is missing photograph key in response
    const missingId = 10;
    let modifiedData;
    if (Array.isArray(data)) {
      modifiedData = data.map(o => {
        return {
          ...o,
          photograph: `${o.photograph || missingId}.webp`
        };
      });
    } else {
      modifiedData = {
        ...data,
        photograph: `${data.photograph || missingId}.webp`
      };
    }
    callback(null, modifiedData);
  }

  static showCachedData(callback, id) {
    return _dbPromise.then(function (db) {
      if (!db) return;

      var store = db
        .transaction('mws-restaurants')
        .objectStore('mws-restaurants');

      // if it is a single record, we invoke a store.get()
      // instead of store.getAll()
      if (id) {
        return store.get(Number(id)).then(function (data) {
          DBHelper.invokeCb(callback, data);
        });
      }

      return store.getAll().then(function (data) {
        DBHelper.invokeCb(callback, data);
      });
    });
  };

  static cacheToDb(data) {
    return _dbPromise.then(function (db) {
      if (!db) {
        return;
      }
      var tx = db.transaction('mws-restaurants', 'readwrite');
      var store = tx.objectStore('mws-restaurants');
      if (Array.isArray(data)) {
        data.forEach(function (restaurant) {
          store.put(restaurant);
        });
      } else {
        store.put(data);
      }
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    DBHelper.showCachedData(callback, id);
    // although restuarants data is already loaded
    // a GET call for restauarant may serve more info
    // than a GET all call; so we fetch by id
    fetch(`http://localhost:1337/restaurants/${id}`)
      .then(response => response.json())
      .then(data => {
        // cache the response to idb
        DBHelper.cacheToDb(data);
        // process the response and invoke callback
        DBHelper.invokeCb(callback, data);
      })
      .catch(error => callback(error, null));
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      })
    marker.addTo(newMap);
    return marker;
  }
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

