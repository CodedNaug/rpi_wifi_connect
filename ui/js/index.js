/* index.js */
$(function () {
    var networks;

    function populateNetworks(list) {
        networks = list || [];
        var $select = $('#ssid-select');
        $select.empty();

        // Optional sentinel for hidden SSIDs
        $select.append(
            $('<option>')
                .text('Hidden network')
                .attr('value', '') // empty value lets server use hidden-ssid field
                .attr('data-security', 'HIDDEN')
        );

        $.each(networks, function (i, val) {
            // Defensive: normalize fields
            var ssid = (val && val.ssid) || '';
            var sec = String((val && val.security) || '').toUpperCase();

            $select.append(
                $('<option>')
                    .text(ssid)
                    .attr('value', ssid) // use standard 'value'
                    .attr('data-security', sec)
            );
        });

        // Trigger form field visibility update
        $select.trigger('change');
    }

    function showHideFormFields() {
        var $opt = $(this).find(':selected');
        var security = ($opt.attr('data-security') || 'NONE').toUpperCase();

        // start off with all fields hidden
        $('#identity-group').addClass('hidden');
        $('#passphrase-group').addClass('hidden');
        $('#hidden-ssid-group').addClass('hidden');

        if (security === 'NONE') {
            return; // no input required
        }
        if (security === 'ENTERPRISE') {
            $('#identity-group').removeClass('hidden');
            $('#passphrase-group').removeClass('hidden');
            return;
        }
        if (security === 'HIDDEN') {
            $('#hidden-ssid-group').removeClass('hidden');
            // fall through to also show passphrase if needed by your backend
            // comment the next line if hidden-open networks are supported
            $('#passphrase-group').removeClass('hidden');
            return;
        }

        // WEP/WPA/WPA2 require a passphrase
        $('#passphrase-group').removeClass('hidden');
    }

    $('#ssid-select').on('change', showHideFormFields);

    // Always get latest reg code (avoid cache)
    $.ajax({
        url: '/regcode',
        method: 'GET',
        cache: false,
        data: { _: Date.now() },
        success: function (data) {
            if (data && data.length !== 0) {
                $('#regcode').val(data);
            } else {
                $('.reg-row').hide(); // no reg code, so hide that part of the UI
            }
        }
    });

    function fetchNetworks() {
        $.ajax({
            url: '/networks',
            method: 'GET',
            cache: false,               // tell jQuery not to cache
            data: { _: Date.now() },    // cache-buster for proxies
            success: function (data) {
                // Server may return JSON string or already-parsed object
                var list = (typeof data === 'string') ? (function () {
                    try { return JSON.parse(data); } catch (e) { return []; }
                })() : (data || []);

                if (!Array.isArray(list) || list.length === 0) {
                    $('.before-submit').hide();
                    $('#no-networks-message').removeClass('hidden');
                    populateNetworks([]); // still reset dropdown
                    return;
                }

                $('.before-submit').show();
                $('#no-networks-message').addClass('hidden');
                populateNetworks(list);
            },
            error: function () {
                // On error, show "no networks" message but keep page usable
                $('.before-submit').hide();
                $('#no-networks-message').removeClass('hidden');
                populateNetworks([]);
            }
        });
    }

    // Initial load
    fetchNetworks();

    // Refetch on focus/visibility/bfcache restore
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') fetchNetworks();
    });
    window.addEventListener('focus', fetchNetworks);
    window.addEventListener('pageshow', function (e) {
        // Safari/iOS back-forward cache
        if (e.persisted) fetchNetworks();
    });

    // Optional: if you add a "Rescan" button with id="rescan"
    $('#rescan').on('click', function (e) {
        e.preventDefault();
        fetchNetworks();
    });

    // Connect form submit
    $('#connect-form').on('submit', function (ev) {
        ev.preventDefault();
        $.post('/connect', $('#connect-form').serialize(), function () {
            $('.before-submit').hide();
            $('#submit-message').removeClass('hidden');
        }).fail(function () {
            // Optional error feedback
            $('#submit-message')
                .removeClass('hidden')
                .text('Failed to submit. Please try again.');
        });
    });
});
