goog.require('gmf.Themes');
goog.require('gmf.ThemesEventType');
goog.require('gmf.test.data.themes');

describe('gmf.Themes', function() {
  var gmfThemes;
  var treeUrl;

  beforeEach(function() {
    inject(function($injector) {
      gmfThemes = $injector.get('gmfThemes');
      treeUrl = $injector.get('gmfTreeUrl') + '?cache_version=0';
      $httpBackend = $injector.get('$httpBackend');
      $httpBackend.when('GET', treeUrl).respond(themes);
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('Get background layers', function() {
    var spy = jasmine.createSpy();
    gmfThemes.getBgLayers({}).then(spy);

    $httpBackend.expectGET(treeUrl);
    themes.background_layers.forEach(function(bgLayer) {
      var response = bgLayer.name == 'map' ? capabilities.map :
          capabilities.asitvd;
      $httpBackend.when('GET', bgLayer.url).respond(response);
      $httpBackend.expectGET(bgLayer.url);
    });
    gmfThemes.loadThemes();
    $httpBackend.flush();

    expect(spy.calls.count()).toBe(1);
    var response = spy.calls.mostRecent().args[0];
    expect(response.length).toBe(4);
    var responseFirstBgName = response[1].get('label');
    var firstBgName = themes.background_layers[0].name;
    expect(responseFirstBgName).toBe(firstBgName);
    expect(response[1].get('querySourceIds')).toBeDefined();
  });

  it('Emit change event', function() {
    var spy = jasmine.createSpy();
    var eventSpy = jasmine.createSpy();
    ol.events.listen(gmfThemes, gmf.ThemesEventType.CHANGE, eventSpy);

    gmfThemes.promise_.then(spy);

    gmfThemes.loadThemes();
    $httpBackend.flush();

    expect(spy.calls.count()).toBe(1);
  });

  it('Load themes', function() {
    var spy = jasmine.createSpy();
    gmfThemes.promise_.then(spy);

    $httpBackend.expectGET(treeUrl);
    gmfThemes.loadThemes();
    $httpBackend.flush();

    expect(spy.calls.count()).toBe(1);
    var data = spy.calls.mostRecent().args[0];
    expect(Object.keys(data)[0]).toBe(Object.keys(themes)[0]);
  });

  it('Get themes object', function() {
    var spy = jasmine.createSpy();
    gmfThemes.getThemesObject().then(spy);

    $httpBackend.expectGET(treeUrl);
    gmfThemes.loadThemes();
    $httpBackend.flush();

    expect(spy.calls.count()).toBe(1);
    var resultThemes = spy.calls.mostRecent().args[0];
    var dataFirstKey = Object.keys(resultThemes[0])[0];
    var themesThemesFirstKey = Object.keys(themes.themes[0])[0];
    expect(dataFirstKey).toBe(themesThemesFirstKey);
  });

  it('Get a theme object (find a specific theme)', function() {
    var themeName = 'Enseignement';
    var spy = jasmine.createSpy();
    gmfThemes.getThemeObject(themeName).then(spy);

    $httpBackend.expectGET(treeUrl);
    gmfThemes.loadThemes();
    $httpBackend.flush();

    expect(spy.calls.count()).toBe(1);
    var resultTheme = spy.calls.mostRecent().args[0];
    expect(resultTheme.name).toBe(themeName);
  });
});
